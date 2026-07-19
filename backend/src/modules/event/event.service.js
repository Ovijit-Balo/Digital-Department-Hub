const { randomUUID } = require('crypto');
const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const Event = require('./event.model');
const EventRegistration = require('./eventRegistration.model');
const ApiError = require('../../utils/ApiError');
const { canManageResource } = require('../../utils/resourceAccess');
const { ROLES } = require('../../config/roles');
const { notifyEventRegistration } = require('../notification/notificationEvents');

// Events may be managed by their creator or by any admin/manager/editor.
const EVENT_MANAGER_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR];

const runInTransaction = async (operation) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await operation(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
};

const buildPagination = ({ page, limit }) => {
  const parsedPage = Number(page || 1);
  const parsedLimit = Number(limit || 20);

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit
  };
};

const buildCalendarWindow = ({ startDate, endDate }) => {
  const start = startDate ? new Date(startDate) : new Date();
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : new Date(start);
  if (!endDate) {
    end.setDate(end.getDate() + 31);
  }
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const createEvent = async (payload, userId) => {
  return Event.create({
    ...payload,
    createdBy: userId
  });
};

const listEvents = async (query, options = {}) => {
  const filter = {};

  if (options.publicOnly) {
    filter.status = 'published';
  }

  if (query.status && !options.publicOnly) {
    filter.status = query.status;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    Event.find(filter).sort({ startTime: 1 }).skip(skip).limit(limit),
    Event.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const listEventCalendar = async (query, options = {}) => {
  const { start, end } = buildCalendarWindow(query);
  const limit = Number(query.limit || 200);

  const filter = {
    startTime: { $lt: end },
    endTime: { $gt: start }
  };

  if (options.publicOnly) {
    filter.status = 'published';
  } else if (query.status) {
    filter.status = query.status;
  }

  const items = await Event.find(filter).sort({ startTime: 1 }).limit(limit);
  const eventIds = items.map((item) => item._id);

  const registrationSummary = await EventRegistration.aggregate([
    {
      $match: {
        event: { $in: eventIds },
        status: { $in: ['registered', 'checked_in'] }
      }
    },
    {
      $group: {
        _id: '$event',
        registrationCount: { $sum: 1 },
        checkedInCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0]
          }
        }
      }
    }
  ]);

  const summaryMap = new Map(registrationSummary.map((item) => [item._id.toString(), item]));

  return {
    startDate: start,
    endDate: end,
    total: items.length,
    items: items.map((item) => {
      const summary = summaryMap.get(item._id.toString()) || {
        registrationCount: 0,
        checkedInCount: 0
      };

      return {
        ...item.toObject(),
        registrationCount: summary.registrationCount,
        checkedInCount: summary.checkedInCount,
        availableSeats: Math.max(item.capacity - summary.registrationCount, 0)
      };
    })
  };
};

const registerForEvent = async ({ eventId, userId }) => {
  let eventTitle;

  const registration = await runInTransaction(async (session) => {
    const event = await Event.findById(eventId).session(session);

    if (!event) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    eventTitle = event.title;

    if (event.status !== 'published') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Event is not open for registration');
    }

    if (event.registrationDeadline < new Date()) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Registration deadline has passed');
    }

    const existingRegistration = await EventRegistration.findOne({
      event: eventId,
      attendee: userId
    }).session(session);
    if (existingRegistration && existingRegistration.status !== 'cancelled') {
      throw new ApiError(StatusCodes.CONFLICT, 'You are already registered for this event');
    }

    const registrationCount = await EventRegistration.countDocuments({
      event: eventId,
      status: { $in: ['registered', 'checked_in'] }
    }).session(session);

    if (registrationCount >= event.capacity) {
      throw new ApiError(StatusCodes.CONFLICT, 'Event is full');
    }

    const qrToken = randomUUID();
    const qrPayload = JSON.stringify({ eventId, qrToken });
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

    // The unique {event, attendee} index allows only one registration document
    // per user per event, so a cancelled registration is revived with a fresh
    // QR pass instead of inserting a new row.
    if (existingRegistration) {
      existingRegistration.status = 'registered';
      existingRegistration.qrToken = qrToken;
      existingRegistration.qrCodeDataUrl = qrCodeDataUrl;
      existingRegistration.checkedInAt = undefined;
      await existingRegistration.save({ session });
      return existingRegistration;
    }

    const [registration] = await EventRegistration.create(
      [
        {
          event: eventId,
          attendee: userId,
          qrToken,
          qrCodeDataUrl
        }
      ],
      { session }
    );

    return registration;
  });

  await notifyEventRegistration({ registration, eventTitle });

  return registration;
};

const checkIn = async ({ eventId, qrToken }) => {
  const registration = await EventRegistration.findOne({ event: eventId, qrToken });

  if (!registration) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Registration not found for QR token');
  }

  if (registration.status === 'checked_in') {
    throw new ApiError(StatusCodes.CONFLICT, 'Attendee is already checked in');
  }

  registration.status = 'checked_in';
  registration.checkedInAt = new Date();
  await registration.save();

  return registration;
};

const submitFeedback = async ({ registrationId, attendeeId, payload }) => {
  const registration = await EventRegistration.findById(registrationId);

  if (!registration) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event registration not found');
  }

  if (registration.attendee.toString() !== attendeeId.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only submit feedback for your registration');
  }

  registration.feedback = {
    rating: payload.rating,
    comment: payload.comment || '',
    submittedAt: new Date()
  };

  await registration.save();
  return registration;
};

// A user's own registrations across all events — lets attendees re-open their
// QR pass any time instead of only in the moment of registration.
const listMyRegistrations = async ({ attendeeId, query }) => {
  const filter = { attendee: attendeeId };
  if (query.status) {
    filter.status = query.status;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    EventRegistration.find(filter)
      .populate('event', 'title location startTime endTime status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    EventRegistration.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const cancelRegistration = async ({ registrationId, attendeeId }) => {
  const registration = await EventRegistration.findById(registrationId).populate(
    'event',
    'title startTime'
  );

  if (!registration) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event registration not found');
  }

  if (registration.attendee.toString() !== attendeeId.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only cancel your own registration');
  }

  if (registration.status !== 'registered') {
    throw new ApiError(StatusCodes.CONFLICT, 'Only active registrations can be cancelled');
  }

  if (registration.event?.startTime && new Date(registration.event.startTime) <= new Date()) {
    throw new ApiError(StatusCodes.CONFLICT, 'Cannot cancel after the event has started');
  }

  // Frees the seat automatically: capacity counts only registered/checked_in.
  registration.status = 'cancelled';
  await registration.save();

  return registration;
};

const listRegistrations = async ({ eventId, query }) => {
  const filter = { event: eventId };
  if (query.status) {
    filter.status = query.status;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    EventRegistration.find(filter)
      .populate('attendee', 'fullName email department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    EventRegistration.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const updateEvent = async (eventId, payload, user) => {
  const event = await Event.findById(eventId);

  if (!event) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }

  if (!canManageResource(user, event.createdBy, EVENT_MANAGER_ROLES)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only modify events you created unless you are an admin, manager, or editor'
    );
  }

  // Apply updates
  event.title = payload.title;
  event.description = payload.description;
  event.location = payload.location;
  event.startTime = payload.startTime;
  event.endTime = payload.endTime;
  event.registrationDeadline = payload.registrationDeadline;
  event.capacity = payload.capacity;
  if (payload.status) event.status = payload.status;

  await event.save();
  return event;
};

// Deleting an event cascades to its source booking when one is linked: the
// booking is marked cancelled so the two records never drift apart. The reverse
// direction (cancelling a booking) is handled in the booking service.
const deleteEvent = async (eventId, user) => {
  return runInTransaction(async (session) => {
    const event = await Event.findById(eventId).session(session);

    if (!event) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    if (!canManageResource(user, event.createdBy, EVENT_MANAGER_ROLES)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You can only delete events you created unless you are an admin, manager, or editor'
      );
    }

    if (event.sourceBooking) {
      // Lazy require avoids a circular dependency between the event and booking
      // services (booking already requires the event model, not this service).
      const VenueBooking = require('../booking/venueBooking.model');
      const booking = await VenueBooking.findById(event.sourceBooking).session(session);
      if (booking && booking.status === 'approved') {
        booking.status = 'cancelled';
        booking.eventId = undefined;
        await booking.save({ session });
      }
    }

    await event.deleteOne({ session });
    return event;
  });
};

module.exports = {
  createEvent,
  listEvents,
  listEventCalendar,
  registerForEvent,
  checkIn,
  submitFeedback,
  listRegistrations,
  listMyRegistrations,
  cancelRegistration,
  updateEvent,
  deleteEvent
};
