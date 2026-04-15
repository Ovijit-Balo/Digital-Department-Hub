const { createLogger, format, transports } = require('winston');
const env = require('./env');

const logger = createLogger({
  level: env.LOG_LEVEL,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ level, message, timestamp, stack }) => {
      return `${timestamp} [${level}] ${stack || message}`;
    })
  ),
  transports: [new transports.Console()]
});

module.exports = logger;
