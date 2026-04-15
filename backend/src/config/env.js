const path = require('path');
const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(5000),
  MONGODB_URI: Joi.string().default('mongodb://localhost:27017/digital_department_hub'),
  JWT_SECRET: Joi.string().min(16).default('development-secret-key-12345'),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  RUN_WORKER_WITH_API: Joi.boolean().default(false),
  ENABLE_QUEUE: Joi.boolean().default(process.env.NODE_ENV !== 'test'),
  STORAGE_PROVIDER: Joi.string().valid('cloudinary', 's3').default('cloudinary'),
  FRONTEND_URL: Joi.string().default('http://localhost:5173'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
  EMAIL_FROM: Joi.string().default('no-reply@departmenthub.edu'),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),
  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow('').optional()
})
  .unknown()
  .required();

const { value, error } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

const parseBoolean = (raw) => raw === true || raw === 'true';

module.exports = {
  ...value,
  PORT: Number(value.PORT),
  REDIS_PORT: Number(value.REDIS_PORT),
  RUN_WORKER_WITH_API: parseBoolean(value.RUN_WORKER_WITH_API),
  ENABLE_QUEUE: parseBoolean(value.ENABLE_QUEUE)
};
