const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const requestContext = require('./middlewares/requestContext');
const auditMiddleware = require('./middlewares/auditMiddleware');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const sitemapRoutes = require('./modules/sitemap/sitemap.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests. Please try again later.'
  }
});

// Input sanitization to prevent NoSQL injection
try {
  const mongoSanitize = require('express-mongo-sanitize');
  // remove any keys that begin with '$' or contain '.'
  app.use(mongoSanitize());
} catch {
  // optional dependency may not be installed in all environments
}

// Configure CORS with a safe dev-mode fallback.
// In production, set `FRONTEND_URL` to a comma-separated list of allowed origins.
const isDev = env.NODE_ENV === 'development';
const allowedOrigins = env.FRONTEND_URL && env.FRONTEND_URL !== '*'
  ? env.FRONTEND_URL.split(',').map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser requests (curl, Postman) without an Origin header
      if (!origin) return cb(null, true);
      // In development you may set FRONTEND_URL='*' to allow any origin.
      if (isDev && env.FRONTEND_URL === '*') return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
  })
);
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestContext);
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim())
    }
  })
);
app.use(auditMiddleware);

app.get(['/health', '/api/health'], (req, res) => {
  res.set('cache-control', 'no-store');
  res
    .status(200)
    .json({ status: 'ok', service: 'digital-department-hub-api', requestId: req.requestId });
});

app.use('/api', apiLimiter);
app.use('/', sitemapRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
