const cron = require('node-cron');
const env = require('../config/env');
const logger = require('../config/logger');
const { runReminderSweep } = require('../modules/reminders/reminder.service');

let scheduledTask = null;

// Starts the in-process reminder scheduler. The app is deployed to an always-on
// Node server (not serverless), so a node-cron task inside the API process is
// the simplest reliable trigger — no external scheduler required. The HTTP
// endpoint (/api/reminders/run) remains available for manual/one-off runs.
const startReminderScheduler = () => {
  if (!env.ENABLE_REMINDER_CRON) {
    logger.info('Reminder scheduler is disabled (ENABLE_REMINDER_CRON=false)');
    return null;
  }

  if (!cron.validate(env.REMINDER_CRON)) {
    logger.error(`Invalid REMINDER_CRON expression "${env.REMINDER_CRON}"; scheduler not started`);
    return null;
  }

  if (scheduledTask) {
    return scheduledTask;
  }

  scheduledTask = cron.schedule(env.REMINDER_CRON, async () => {
    try {
      await runReminderSweep();
    } catch (error) {
      // The sweep is best-effort; a failure must never crash the server.
      logger.error(`Reminder sweep failed: ${error.message}`);
    }
  });

  logger.info(`Reminder scheduler started (cron: ${env.REMINDER_CRON})`);
  return scheduledTask;
};

const stopReminderScheduler = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
};

module.exports = {
  startReminderScheduler,
  stopReminderScheduler
};
