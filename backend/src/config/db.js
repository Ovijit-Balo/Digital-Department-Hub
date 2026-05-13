const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

const summarizeMongoTarget = (uri) => {
  const hostFromAuth = uri.match(/@([^/?]+)/);
  if (hostFromAuth) {
    return hostFromAuth[1];
  }
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:\/\//i, 'http://'));
    return u.port ? `${u.hostname}:${u.port}` : u.hostname;
  } catch {
    return '(could not parse URI)';
  }
};

const connectDB = async () => {
  mongoose.set('strictQuery', true);

  logger.info(`Connecting to MongoDB at ${summarizeMongoTarget(env.MONGODB_URI)}`);
  await mongoose.connect(env.MONGODB_URI);
  logger.info('MongoDB connected successfully');

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
};

module.exports = connectDB;
