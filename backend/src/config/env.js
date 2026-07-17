const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Joi = require('joi');

// Load variables from backend/.env first, then allow the current working directory to override.
// This fixes `MONGODB_URI` missing when the process is started from the repo root instead of `backend/`.
const backendEnvPath = path.join(__dirname, '..', '..', '.env');
const cwdEnvPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: backendEnvPath });
dotenv.config({ path: cwdEnvPath, override: true });

if (!fs.existsSync(backendEnvPath) && !fs.existsSync(cwdEnvPath)) {
  dotenv.config();
}

const DEFAULT_JWT_SECRET = 'development-secret-key-12345';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(5000),
  // Prefer IPv4 localhost by default to avoid Windows IPv6 (::1) binding issues.
  MONGODB_URI: Joi.string().default('mongodb://127.0.0.1:27017/digital_department_hub'),
  JWT_SECRET: Joi.string().min(16).default(DEFAULT_JWT_SECRET),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  REFRESH_TOKEN_EXPIRES_DAYS: Joi.number().default(7),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  RUN_WORKER_WITH_API: Joi.boolean().default(false),
  ENABLE_QUEUE: Joi.boolean().default(process.env.NODE_ENV !== 'test'),
  STORAGE_PROVIDER: Joi.string().valid('cloudinary', 's3').default('cloudinary'),
  FRONTEND_URL: Joi.string().default('http://localhost:5173'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
  // Global per-IP API rate limit. The default is sized for an authenticated admin SPA
  // where a single dashboard view fans out into several requests; auth/contact endpoints
  // keep their own stricter limiters.
  RATE_LIMIT_WINDOW_MIN: Joi.number().default(15),
  RATE_LIMIT_MAX: Joi.number().default(1000),
  EMAIL_FROM: Joi.string().default('no-reply@departmenthub.edu'),
  // SMTP is optional: when SMTP_USER + SMTP_PASS are set, emails are sent for real
  // via nodemailer; otherwise the mailer falls back to logging (dev placeholder).
  SMTP_HOST: Joi.string().default('smtp.gmail.com'),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
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

if (value.NODE_ENV === 'production' && value.JWT_SECRET === DEFAULT_JWT_SECRET) {
  throw new Error(
    'JWT_SECRET must be set to a strong unique value in production. Do not use the default development secret.'
  );
}

const parseBoolean = (raw) => raw === true || raw === 'true';

module.exports = {
  ...value,
  PORT: Number(value.PORT),
  REDIS_PORT: Number(value.REDIS_PORT),
  RATE_LIMIT_WINDOW_MIN: Number(value.RATE_LIMIT_WINDOW_MIN),
  RATE_LIMIT_MAX: Number(value.RATE_LIMIT_MAX),
  RUN_WORKER_WITH_API: parseBoolean(value.RUN_WORKER_WITH_API),
  ENABLE_QUEUE: parseBoolean(value.ENABLE_QUEUE),
  SMTP_PORT: Number(value.SMTP_PORT),
  SMTP_SECURE: parseBoolean(value.SMTP_SECURE)
};
