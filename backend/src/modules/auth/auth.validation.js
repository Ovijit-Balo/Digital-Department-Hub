const Joi = require('joi');
const { ALL_ROLES } = require('../../config/roles');

const register = {
  body: Joi.object({
    fullName: Joi.string().min(2).max(120).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    department: Joi.string().max(120).optional(),
    languagePreference: Joi.string().valid('en', 'bn').optional(),
    roles: Joi.array().items(Joi.string().valid(...ALL_ROLES)).optional()
  })
};

const login = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

const resetPassword = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required()
  })
};

module.exports = {
  register,
  login,
  resetPassword
};
