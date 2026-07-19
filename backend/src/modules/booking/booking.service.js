const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const Venue = require('./venue.model');
const VenueBooking = require('./venueBooking.model');
const Event = require('../event/event.model');
const ApiError = require('../../utils/ApiError');
const { canManageResource } = require('../../utils/resourceAccess');
const { ROLES } = require('../../config/roles');
const { notifyBookingDecision } = require('../notification/notificationEvents');

// Bookings may be managed (edited/deleted) by their requester or by any
// admin/manager. Editors have no role in the booking workflow.
const BOOKING_MANAGER_ROLES = [ROLES.ADMIN, ROLES.MANAGER];

const buildPagination = ({ page, limit }) => {
  const parsedPage = Number(page || 1);
  const parsedLimit = Number(limit || 20);

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit
  };
};

const buildDateRangeFilter = ({ startDate, endDate }) => {
  if (!startDate && !endDate) {
    return null;
  }

  const range = {};

  if (startDate) {
    range.$gte = new Date(startDate);
  }

  if (endDate) {
    range.$lte = new Date(endDate);
  }

  return range;
};

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

const detectConflicts = async ({
  venueId,
  startTime,
  endTime,
  excludeBookingId,
  statuses = ['pending', 'approved'],
  session
}) => {
  const filter = {
    venue: venueId,
    status: { $in: statuses },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  };

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  const query = VenueBooking.find(filter).sort({ startTime: 1 });

  if (session) {
    query.session(session);
  }

  return query;
};

const createVenue = async (payload) => {
  return Venue.create(payload);
};

const updateVenue = async (venueId, payload) => {
  const venue = await Venue.findById(venueId);

  if (!venue) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Venue not found');
  }

  // Deactivating a venue only blocks NEW booking requests; existing approved
  // bookings remain on the calendar.
  Object.assign(venue, payload);
  await venue.save();

  return venue.populate('manager', 'fullName email');
};

const listVenues = async (query) => {
  const filter = {};
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    Venue.find(filter)
      .populate('manager', 'fullName email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Venue.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const requestBooking = async ({ payload, userId }) => {
  return runInTransaction(async (session) => {
    const startTime = new Date(payload.startTime);
    const endTime = new Date(payload.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid booking time range');
    }

    if (endTime <= startTime) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'End time must be later than start time');
    }

    if (payload.bookingType === 'class' && !String(payload.classCode || '').trim()) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Class code is required for class bookings');
    }

    const venue = await Venue.findById(payload.venue).session(session);

    if (!venue || !venue.isActive) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Venue is unavailable');
    }

    if (payload.attendeeCount > venue.capacity) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Attendee count exceeds venue capacity');
    }

    const conflicts = await detectConflicts({
      venueId: payload.venue,
      startTime,
      endTime,
      session
    });

    if (conflicts.length) {
      throw new ApiError(StatusCodes.CONFLICT, 'Booking conflict detected', {
        conflicts: conflicts.map((item) => ({
          id: item._id,
          title: item.title,
          startTime: item.startTime,
          endTime: item.endTime,
          status: item.status
        }))
      });
    }

    const [booking] = await VenueBooking.create(
      [
        {
          ...payload,
          startTime,
          endTime,
          classCode: payload.bookingType === 'class' ? payload.classCode : undefined,
          requester: userId
        }
      ],
      { session }
    );

    return booking;
  });
};

// Requesters may withdraw their own booking while it is still pending —
// approved/rejected requests are already decided and stay in the record.
const cancelMyBooking = async ({ bookingId, requesterId }) => {
  const booking = await VenueBooking.findById(bookingId);

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking request not found');
  }

  if (booking.requester.toString() !== requesterId.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only cancel your own booking requests');
  }

  if (booking.status !== 'pending') {
    throw new ApiError(StatusCodes.CONFLICT, 'Only pending requests can be cancelled');
  }

  booking.status = 'cancelled';
  await booking.save();

  return booking;
};

// Edit a booking's details. The requester or any admin/manager may edit. When
// the booking has a linked published event, matching fields are propagated so
// the two records stay consistent. Cancelled/rejected bookings are frozen.
const updateBooking = async ({ bookingId, payload, user }) => {
  return runInTransaction(async (session) => {
    const booking = await VenueBooking.findById(bookingId).session(session);

    if (!booking) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Booking request not found');
    }

    if (!canManageResource(user, booking.requester, BOOKING_MANAGER_ROLES)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You can only modify your own booking requests unless you are an admin or manager'
      );
    }

    if (['cancelled', 'rejected'].includes(booking.status)) {
      throw new ApiError(StatusCodes.CONFLICT, 'Cancelled or rejected bookings cannot be edited');
    }

    const fields = ['title', 'purpose', 'bookingType', 'classCode', 'attendeeCount'];
    fields.forEach((field) => {
      if (payload[field] !== undefined) {
        booking[field] = payload[field];
      }
    });
    if (payload.venue !== undefined) booking.venue = payload.venue;
    if (payload.startTime !== undefined) booking.startTime = payload.startTime;
    if (payload.endTime !== undefined) booking.endTime = payload.endTime;

    // An approved booking still holds its slot, so any time/venue change must be
    // re-checked against other approved bookings before it is saved.
    if (
      booking.status === 'approved' &&
      (payload.startTime !== undefined || payload.endTime !== undefined || payload.venue !== undefined)
    ) {
      const conflicts = await detectConflicts({
        venueId: booking.venue,
        startTime: booking.startTime,
        endTime: booking.endTime,
        excludeBookingId: booking._id,
        statuses: ['approved'],
        session
      });

      if (conflicts.length) {
        throw new ApiError(StatusCodes.CONFLICT, 'Updated time conflicts with an existing approved booking', {
          conflictBookingId: conflicts[0]._id
        });
      }
    }

    await booking.save({ session });

    // Keep a linked event in sync with the booking's shared fields.
    if (booking.eventId) {
      const event = await Event.findById(booking.eventId).session(session);
      if (event && event.status !== 'cancelled') {
        event.title = booking.title;
        event.description = booking.purpose;
        event.startTime = booking.startTime;
        event.endTime = booking.endTime;
        event.capacity = booking.attendeeCount;
        if (event.registrationDeadline > booking.startTime) {
          event.registrationDeadline = booking.startTime;
        }
        await event.save({ session });
      }
    }

    return booking;
  });
};

// Delete a booking. The requester or any admin/manager may delete. A linked
// published event is cancelled (not deleted) so existing registrations retain
// a record of what happened.
const deleteBooking = async ({ bookingId, user }) => {
  return runInTransaction(async (session) => {
    const booking = await VenueBooking.findById(bookingId).session(session);

    if (!booking) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Booking request not found');
    }

    if (!canManageResource(user, booking.requester, BOOKING_MANAGER_ROLES)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You can only delete your own booking requests unless you are an admin or manager'
      );
    }

    if (booking.eventId) {
      const event = await Event.findById(booking.eventId).session(session);
      if (event && event.status !== 'cancelled') {
        event.status = 'cancelled';
        event.sourceBooking = null;
        await event.save({ session });
      }
    }

    await booking.deleteOne({ session });
    return booking;
  });
};

const listBookings = async (query) => {
  const filter = {};

  if (query.venue) {
    filter.venue = query.venue;
  }
  if (query.requester) {
    filter.requester = query.requester;
  }
  if (query.status) {
    filter.status = query.status;
  }

  if (query.bookingType) {
    filter.bookingType = query.bookingType;
  }

  const startRange = buildDateRangeFilter({ startDate: query.startDate, endDate: query.endDate });
  if (startRange) {
    filter.startTime = startRange;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    VenueBooking.find(filter)
      .populate('venue', 'name location')
      .populate('requester', 'fullName email')
      .populate('approver', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    VenueBooking.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const listMyBookings = async ({ requesterId, query }) => {
  const filter = {
    requester: requesterId
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.bookingType) {
    filter.bookingType = query.bookingType;
  }

  const startRange = buildDateRangeFilter({ startDate: query.startDate, endDate: query.endDate });
  if (startRange) {
    filter.startTime = startRange;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    VenueBooking.find(filter)
      .populate('venue', 'name location')
      .populate('approver', 'fullName email')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit),
    VenueBooking.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const listCalendar = async (query) => {
  const start = query.startDate ? new Date(query.startDate) : new Date();
  start.setHours(0, 0, 0, 0);

  const end = query.endDate ? new Date(query.endDate) : new Date(start);
  if (!query.endDate) {
    end.setDate(end.getDate() + 14);
  }
  end.setHours(23, 59, 59, 999);

  const filter = {
    startTime: { $lt: end },
    endTime: { $gt: start }
  };

  if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = 'approved';
  }

  if (query.venue) {
    filter.venue = query.venue;
  }

  if (query.bookingType) {
    filter.bookingType = query.bookingType;
  }

  const limit = Number(query.limit || 300);

  const items = await VenueBooking.find(filter)
    .populate('venue', 'name location')
    .populate('requester', 'fullName department')
    .sort({ startTime: 1 })
    .limit(limit);

  return {
    startDate: start,
    endDate: end,
    total: items.length,
    items
  };
};

const reviewBooking = async ({ bookingId, approverId, status, decisionNote }) => {
  const booking = await runInTransaction(async (session) => {
    const booking = await VenueBooking.findById(bookingId).session(session);
    if (!booking) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Booking request not found');
    }

    // Separation of duties: admins and managers may request venues like anyone
    // else, but a request must be decided by someone other than its requester —
    // otherwise the approval workflow is a no-op for the people who hold both
    // permissions. Another admin/manager has to action their request.
    if (booking.requester.toString() === approverId.toString()) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You cannot decide your own booking request — another admin or manager must review it'
      );
    }

    if (booking.status !== 'pending') {
      throw new ApiError(StatusCodes.CONFLICT, 'Only pending bookings can be reviewed');
    }

    if (status === 'approved') {
      const conflicts = await detectConflicts({
        venueId: booking.venue,
        startTime: booking.startTime,
        endTime: booking.endTime,
        excludeBookingId: booking._id,
        statuses: ['approved'],
        session
      });

      if (conflicts.length) {
        const blockingConflict = conflicts[0];
        throw new ApiError(
          StatusCodes.CONFLICT,
          'Cannot approve booking due to existing approved conflict',
          {
            conflictBookingId: blockingConflict._id,
            conflictWindow: {
              startTime: blockingConflict.startTime,
              endTime: blockingConflict.endTime
            }
          }
        );
      }
    }

    booking.status = status;
    booking.approver = approverId;
    booking.decisionAt = new Date();
    booking.decisionNote = decisionNote || '';

    // Approving an "event"-type booking publishes a matching public Event so it
    // shows up on the Events tab for registration. Other booking types (class,
    // lab, other) are private room reservations and never surface as events.
    if (status === 'approved' && booking.bookingType === 'event') {
      const venue = await Venue.findById(booking.venue).select('name location').session(session);

      const [event] = await Event.create(
        [
          {
            title: booking.title,
            description: booking.purpose,
            location: venue ? `${venue.name}${venue.location ? ` — ${venue.location}` : ''}` : booking.title,
            startTime: booking.startTime,
            endTime: booking.endTime,
            // Bookings carry no separate registration deadline; default it to the
            // event start so registration stays open until the event begins.
            registrationDeadline: booking.startTime,
            // Seat count comes from the requested attendee count.
            capacity: booking.attendeeCount,
            status: 'published',
            // The approver owns the event so someone with event-management
            // rights can edit it; the original requester is kept separately.
            createdBy: approverId,
            requestedBy: booking.requester,
            sourceBooking: booking._id
          }
        ],
        { session }
      );

      // Link back so cancelling/deleting either side can cascade to the other.
      booking.eventId = event._id;
    }

    await booking.save({ session });

    return booking;
  });

  const venue = await Venue.findById(booking.venue).select('name');
  await notifyBookingDecision({ booking, venueName: venue ? venue.name : '' });

  return booking;
};

module.exports = {
  createVenue,
  updateVenue,
  listVenues,
  requestBooking,
  cancelMyBooking,
  updateBooking,
  deleteBooking,
  listBookings,
  listMyBookings,
  listCalendar,
  reviewBooking,
  detectConflicts
};
