const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const requestContext = require('./middlewares/requestContext');
const auditMiddleware = require('./middlewares/auditMiddleware');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL.split(',').map((origin) => origin.trim()),
    credentials: true
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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'digital-department-hub-api' });
});

app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
