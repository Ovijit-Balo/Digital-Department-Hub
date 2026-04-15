const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

  logger.error(err.stack || err.message);

  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    details: err.details || null,
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

module.exports = errorHandler;
