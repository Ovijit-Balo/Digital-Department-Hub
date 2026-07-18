const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const reminderService = require('./reminder.service');

// Constant-time-ish comparison of the presented secret against CRON_SECRET.
// Accepts either `Authorization: Bearer <secret>` (Vercel Cron style) or an
// `x-cron-secret` header.
const isAuthorized = (req) => {
  if (!env.CRON_SECRET) {
    return null; // signals "not configured"
  }

  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const presented = req.headers['x-cron-secret'] || bearer;

  return presented && presented === env.CRON_SECRET;
};

// POST /reminders/run — triggered by an external scheduler (Vercel Cron, GitHub
// Actions, cron-job.org). Runs the idempotent reminder sweep.
const runReminders = asyncHandler(async (req, res) => {
  const authorized = isAuthorized(req);

  if (authorized === null) {
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      'Reminder sweep is not configured. Set CRON_SECRET to enable it.'
    );
  }

  if (!authorized) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or missing cron secret');
  }

  const windowDays = req.body && Number(req.body.windowDays);
  const summary = await reminderService.runReminderSweep(
    Number.isFinite(windowDays) && windowDays > 0 ? { windowDays } : {}
  );

  res.status(StatusCodes.OK).json(summary);
});

module.exports = {
  runReminders
};
