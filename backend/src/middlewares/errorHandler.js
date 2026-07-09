const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

  const detailSuffix = err.details ? ` :: ${JSON.stringify(err.details)}` : '';
  const summary = `${req.method} ${req.originalUrl} -> ${statusCode} ${err.message}${detailSuffix}`;

  if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    // Genuine server faults: log the full stack for debugging.
    logger.error(err.stack || summary);
  } else {
    // Expected client/operational errors (invalid token, validation, conflicts):
    // log concisely at warn without a stack trace to avoid flooding the logs.
    logger.warn(summary);
  }

  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    details: err.details || null,
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

module.exports = errorHandler;
