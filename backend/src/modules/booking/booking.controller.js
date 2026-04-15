const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const bookingService = require('./booking.service');

const createVenue = asyncHandler(async (req, res) => {
  const venue = await bookingService.createVenue(req.body);

  res.locals.auditMeta = {
    action: 'CREATE_VENUE',
    entityType: 'Venue',
    entityId: venue._id.toString(),
    after: venue
  };

  res.status(StatusCodes.CREATED).json({ venue });
});

const listVenues = asyncHandler(async (req, res) => {
  const data = await bookingService.listVenues(req.query);
  res.status(StatusCodes.OK).json(data);
});

const requestBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.requestBooking({
    payload: req.body,
    userId: req.user._id
  });

  res.locals.auditMeta = {
    action: 'REQUEST_VENUE_BOOKING',
    entityType: 'VenueBooking',
    entityId: booking._id.toString(),
    after: booking
  };

  res.status(StatusCodes.CREATED).json({ booking });
});

const listBookings = asyncHandler(async (req, res) => {
  const data = await bookingService.listBookings(req.query);
  res.status(StatusCodes.OK).json(data);
});

const decision = asyncHandler(async (req, res) => {
  const booking = await bookingService.reviewBooking({
    bookingId: req.params.bookingId,
    approverId: req.user._id,
    status: req.body.status,
    decisionNote: req.body.decisionNote
  });

  res.locals.auditMeta = {
    action: 'REVIEW_VENUE_BOOKING',
    entityType: 'VenueBooking',
    entityId: booking._id.toString(),
    after: { status: booking.status, approver: req.user._id.toString() }
  };

  res.status(StatusCodes.OK).json({ booking });
});

const checkConflicts = asyncHandler(async (req, res) => {
  const conflicts = await bookingService.detectConflicts({
    venueId: req.query.venueId,
    startTime: new Date(req.query.startTime),
    endTime: new Date(req.query.endTime)
  });

  res.status(StatusCodes.OK).json({
    hasConflict: conflicts.length > 0,
    conflicts
  });
});

module.exports = {
  createVenue,
  listVenues,
  requestBooking,
  listBookings,
  decision,
  checkConflicts
};
