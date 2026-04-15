const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const Venue = require('./venue.model');
const VenueBooking = require('./venueBooking.model');
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

const listVenues = async (query) => {
  const filter = {};
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    Venue.find(filter).populate('manager', 'fullName email').sort({ name: 1 }).skip(skip).limit(limit),
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
    const venue = await Venue.findById(payload.venue).session(session);

    if (!venue || !venue.isActive) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Venue is unavailable');
    }

    if (payload.attendeeCount > venue.capacity) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Attendee count exceeds venue capacity');
    }

    const conflicts = await detectConflicts({
      venueId: payload.venue,
      startTime: new Date(payload.startTime),
      endTime: new Date(payload.endTime),
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
          requester: userId
        }
      ],
      { session }
    );

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

const reviewBooking = async ({ bookingId, approverId, status, decisionNote }) => {
  return runInTransaction(async (session) => {
    const booking = await VenueBooking.findById(bookingId).session(session);
    if (!booking) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Booking request not found');
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
    await booking.save({ session });

    return booking;
  });
};

module.exports = {
  createVenue,
  listVenues,
  requestBooking,
  listBookings,
  reviewBooking,
  detectConflicts
};
