const env = require('../../config/env');
const logger = require('../../config/logger');
const NotificationLog = require('../../modules/notification/notificationLog.model');
const QUEUES = require('../constants');

const processNotificationJob = async (job) => {
  const { notificationLogId } = job.data;
  const notification = await NotificationLog.findById(notificationLogId);

  if (!notification) {
    return;
  }

  try {
    if (notification.channel === 'email') {
      logger.info(`Sending email notification to ${notification.recipient}`);
    }

    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.error = null;
    await notification.save();
  } catch (error) {
    notification.status = 'failed';
    notification.error = error.message;
    await notification.save();
    throw error;
  }
};

const startNotificationWorker = () => {
  if (!env.ENABLE_QUEUE) {
    logger.warn('Notification worker is disabled because ENABLE_QUEUE=false');
    return null;
  }

  const { Worker, QueueEvents } = require('bullmq');
  const redisConnection = require('../../config/redis');

  const worker = new Worker(QUEUES.NOTIFICATION_DISPATCH, processNotificationJob, {
    connection: redisConnection,
    concurrency: 5
  });

  const queueEvents = new QueueEvents(QUEUES.NOTIFICATION_DISPATCH, {
    connection: redisConnection
  });

  worker.on('completed', (job) => {
    logger.info(`Notification job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Notification job failed: ${job ? job.id : 'unknown'} - ${err.message}`);
  });

  queueEvents.on('error', (error) => {
    logger.error(`Queue events error: ${error.message}`);
  });

  return { worker, queueEvents };
};

if (require.main === module) {
  const runtime = startNotificationWorker();
  if (runtime) {
    logger.info('Notification worker started');
  }
}

module.exports = {
  startNotificationWorker
};
