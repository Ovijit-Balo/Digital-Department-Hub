const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const connectDB = require('./config/db');
const cors = require('cors');

// Initialize database connection
let dbConnected = false;

const initializeDB = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};

const corsOptions = {
  origin: '*',
  optionSuccessStatus: 200
};

app.use(cors(corsOptions));

// For Vercel serverless deployment
if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
  module.exports = async (req, res) => {
    await initializeDB();
    return app(req, res);
  };
} else {
  // For local development
  const startServer = async () => {
    try {
      await initializeDB();

      const server = app.listen(env.PORT, () => {
        logger.info(`API listening on port ${env.PORT}`);
      });

      server.on('error', (error) => {
        if (error?.code === 'EADDRINUSE') {
          logger.error(
            `Port ${env.PORT} is already in use. Stop the other backend process or change PORT in your .env file.`
          );
        } else {
          logger.error(`HTTP server error: ${error.message}`);
        }

        process.exit(1);
      });

      const shutdown = () => {
        server.close(() => {
          logger.info('HTTP server closed');
          process.exit(0);
        });
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    } catch (error) {
      logger.error(`Failed to start server: ${error.message}`);

      const isMongoConnectionIssue =
        typeof error?.message === 'string' &&
        (error.message.includes('ECONNREFUSED') ||
          error.message.toLowerCase().includes('failed to connect') ||
          error.message.toLowerCase().includes('mongodb'));

      if (isMongoConnectionIssue) {
        logger.error(
          'MongoDB is not reachable. Check that the service is running and MONGODB_URI matches it.'
        );
        logger.info(`Effective MONGODB_URI (from env): ${env.MONGODB_URI}`);
        logger.info(
          'Tip: copy backend/.env.example to backend/.env, or run npm scripts from the backend folder.'
        );
        if (process.platform === 'win32') {
          logger.info(
            'Windows: install MongoDB Server (winget install -e --id MongoDB.Server), then start the MongoDB Windows service.'
          );
        }
      }

      process.exit(1);
    }
  };

  startServer();
}
