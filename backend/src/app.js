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

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  limit: env.RATE_LIMIT_MAX,
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

// Normalize an origin so trivial differences don't cause false CORS rejections:
// strip surrounding whitespace, drop any trailing slash, and lowercase the
// scheme+host (origins are case-insensitive on host but not on path — origins
// have no path, so lowercasing the whole thing is safe). This is the #1 cause
// of "works locally, breaks in deployment": FRONTEND_URL set with a trailing
// slash while the browser sends the Origin without one.
const normalizeOrigin = (value) => (value || '').trim().replace(/\/+$/, '').toLowerCase();

const allowedOrigins = env.FRONTEND_URL && env.FRONTEND_URL !== '*'
  ? env.FRONTEND_URL.split(',').map(normalizeOrigin).filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser requests (curl, Postman, health checks) without an Origin header.
      if (!origin) return cb(null, true);
      // In development you may set FRONTEND_URL='*' to allow any origin.
      if (isDev && env.FRONTEND_URL === '*') return cb(null, true);
      if (allowedOrigins.includes(normalizeOrigin(origin))) return cb(null, true);
      // Reject cleanly: returning `false` (instead of throwing) means the
      // browser blocks the request via the missing Access-Control-Allow-Origin
      // header, rather than surfacing a misleading 500 from the error handler.
      // Log the rejected origin so it can be diagnosed from deployment logs.
      logger.warn(
        `CORS: rejected origin "${origin}". Allowed: [${allowedOrigins.join(', ') || 'none — set FRONTEND_URL'}]`
      );
      return cb(null, false);
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
// Every API module (incl. analytics + admin) is mounted through routes/routeModules.js.
app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
