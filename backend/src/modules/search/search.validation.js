const Joi = require('joi');

const search = {
  query: Joi.object({
    q: Joi.string().trim().min(2).max(100).required(),
    limit: Joi.number().min(1).max(20).default(6)
  })
};

module.exports = { search };
