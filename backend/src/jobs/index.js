const startWorkers = () => {
  const { startNotificationWorker } = require('./workers/notificationWorker');
  startNotificationWorker();
};

module.exports = {
  startWorkers
};
