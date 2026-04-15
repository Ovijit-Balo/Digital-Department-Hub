const env = require('../../config/env');
const QUEUES = require('../constants');

let notificationQueue = null;

const getNotificationQueue = () => {
  if (!env.ENABLE_QUEUE) {
    return null;
  }

  if (notificationQueue) {
    return notificationQueue;
  }

  const { Queue } = require('bullmq');
  const redisConnection = require('../../config/redis');

  notificationQueue = new Queue(QUEUES.NOTIFICATION_DISPATCH, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1500
      },
      removeOnComplete: 500,
      removeOnFail: 1000
    }
  });

  return notificationQueue;
};

module.exports = {
  getNotificationQueue
};
