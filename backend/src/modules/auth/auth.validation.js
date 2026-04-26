const Joi = require('joi');
const { ALL_ROLES } = require('../../config/roles');

const objectId = Joi.string().hex().length(24);

const register = {
  body: Joi.object({
    fullName: Joi.string().min(2).max(120).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    department: Joi.string().max(120).optional(),
    languagePreference: Joi.string().valid('en', 'bn').optional()
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

const listUsers = {
  query: Joi.object({
    search: Joi.string().max(120).optional(),
    role: Joi.string().valid(...ALL_ROLES).optional(),
    isActive: Joi.boolean().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const updateUserRoles = {
  params: Joi.object({
    userId: objectId.required()
  }),
  body: Joi.object({
    roles: Joi.array().items(Joi.string().valid(...ALL_ROLES)).min(1).required()
  })
};

module.exports = {
  register,
  login,
  resetPassword,
  listUsers,
  updateUserRoles
};
