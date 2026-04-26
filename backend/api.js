const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const connectDB = require('./src/config/db');

// Initialize database connection
let dbConnected = false;

const initializeDB = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};

// Vercel serverless function handler
module.exports = async (req, res) => {
  try {
    await initializeDB();
    return app(req, res);
  } catch (error) {
    logger.error(`Vercel function error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};
