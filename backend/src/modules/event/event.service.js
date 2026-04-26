const { randomUUID } = require('crypto');
const { StatusCodes } = require('http-status-codes');
const QRCode = require('qrcode');
const Event = require('./event.model');
const EventRegistration = require('./eventRegistration.model');
const ApiError = require('../../utils/ApiError');

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

  const summaryMap = new Map(
    registrationSummary.map((item) => [item._id.toString(), item])
  );

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
  const event = await Event.findById(eventId);

  if (!event) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }

  if (event.status !== 'published') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Event is not open for registration');
  }

  if (event.registrationDeadline < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Registration deadline has passed');
  }

  const alreadyRegistered = await EventRegistration.findOne({ event: eventId, attendee: userId });
  if (alreadyRegistered) {
    throw new ApiError(StatusCodes.CONFLICT, 'You are already registered for this event');
  }

  const registrationCount = await EventRegistration.countDocuments({
    event: eventId,
    status: { $in: ['registered', 'checked_in'] }
  });

  if (registrationCount >= event.capacity) {
    throw new ApiError(StatusCodes.CONFLICT, 'Event is full');
  }

  const qrToken = randomUUID();
  const qrPayload = JSON.stringify({ eventId, qrToken });
  const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

  const registration = await EventRegistration.create({
    event: eventId,
    attendee: userId,
    qrToken,
    qrCodeDataUrl
  });

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

module.exports = {
  createEvent,
  listEvents,
  listEventCalendar,
  registerForEvent,
  checkIn,
  submitFeedback,
  listRegistrations
};
