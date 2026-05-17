const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  const segments = ['params', 'query', 'body'];

  for (const segment of segments) {
    if (!schema[segment]) {
      continue;
    }

    const { value, error } = schema[segment].validate(req[segment], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const detailSummary = error.details
        .map((detail) => detail.message)
        .filter(Boolean)
        .join('; ');

      return next(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          detailSummary ? `Validation failed: ${detailSummary}` : 'Validation failed',
          error.details
        )
      );
    }

    req[segment] = value;
  }

  return next();
};

module.exports = validate;
