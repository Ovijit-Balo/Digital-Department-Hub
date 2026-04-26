const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const eventService = require('./event.service');

const createEvent = asyncHandler(async (req, res) => {
  const event = await eventService.createEvent(req.body, req.user._id);

  res.locals.auditMeta = {
    action: 'CREATE_EVENT',
    entityType: 'Event',
    entityId: event._id.toString(),
    after: event
  };

  res.status(StatusCodes.CREATED).json({ event });
});

const listEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listEvents(req.query, { publicOnly: true });
  res.status(StatusCodes.OK).json(data);
});

const listManageEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listEvents(req.query, { publicOnly: false });
  res.status(StatusCodes.OK).json(data);
});

const listCalendar = asyncHandler(async (req, res) => {
  const data = await eventService.listEventCalendar(req.query, { publicOnly: true });
  res.status(StatusCodes.OK).json(data);
});

const listManageCalendar = asyncHandler(async (req, res) => {
  const data = await eventService.listEventCalendar(req.query, { publicOnly: false });
  res.status(StatusCodes.OK).json(data);
});

const registerForEvent = asyncHandler(async (req, res) => {
  const registration = await eventService.registerForEvent({
    eventId: req.params.eventId,
    userId: req.user._id
  });

  res.locals.auditMeta = {
    action: 'REGISTER_EVENT',
    entityType: 'EventRegistration',
    entityId: registration._id.toString(),
    after: { event: registration.event.toString(), attendee: registration.attendee.toString() }
  };

  res.status(StatusCodes.CREATED).json({ registration });
});

const checkIn = asyncHandler(async (req, res) => {
  const registration = await eventService.checkIn({
    eventId: req.body.eventId,
    qrToken: req.body.qrToken
  });

  res.locals.auditMeta = {
    action: 'CHECK_IN_EVENT',
    entityType: 'EventRegistration',
    entityId: registration._id.toString(),
    after: { status: registration.status, checkedInAt: registration.checkedInAt }
  };

  res.status(StatusCodes.OK).json({ registration });
});

const submitFeedback = asyncHandler(async (req, res) => {
  const registration = await eventService.submitFeedback({
    registrationId: req.params.registrationId,
    attendeeId: req.user._id,
    payload: req.body
  });

  res.locals.auditMeta = {
    action: 'EVENT_FEEDBACK',
    entityType: 'EventRegistration',
    entityId: registration._id.toString(),
    after: registration.feedback
  };

  res.status(StatusCodes.OK).json({ registration });
});

const listRegistrations = asyncHandler(async (req, res) => {
  const data = await eventService.listRegistrations({
    eventId: req.params.eventId,
    query: req.query
  });

  res.status(StatusCodes.OK).json(data);
});

module.exports = {
  createEvent,
  listEvents,
  listManageEvents,
  listCalendar,
  listManageCalendar,
  registerForEvent,
  checkIn,
  submitFeedback,
  listRegistrations
};
