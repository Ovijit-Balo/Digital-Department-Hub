const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const connectDB = require('./config/db');

// Initialize database connection
let dbConnected = false;

const initializeDB = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};

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
      process.exit(1);
    }
  };

  startServer();
}
