const mongoose = require('mongoose');

async function setupMongoTest() {
  const testMongoUri = process.env.TEST_MONGODB_URI;

  if (!testMongoUri) {
    throw new Error('TEST_MONGODB_URI is required for Mongo-backed tests.');
  }

  process.env.MONGODB_URI = testMongoUri;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  return null;
}

async function cleanupMongoTest(mongoServer) {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
}

module.exports = {
  setupMongoTest,
  cleanupMongoTest
};
