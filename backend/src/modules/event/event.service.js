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

const createEvent = async (payload, userId) => {
  return Event.create({
    ...payload,
    createdBy: userId
  });
};

const listEvents = async (query) => {
  const filter = {};

  if (query.status) {
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
  registerForEvent,
  checkIn,
  submitFeedback,
  listRegistrations
};
