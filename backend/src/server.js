const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const connectDB = require('./config/db');
const { startWorkers } = require('./jobs');

const startServer = async () => {
  try {
    await connectDB();

    if (env.RUN_WORKER_WITH_API) {
      startWorkers();
    }

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
