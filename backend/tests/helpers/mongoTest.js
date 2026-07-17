const mongoose = require('mongoose');

let memoryServer = null;

/**
 * Connect Mongoose to a test database. If TEST_MONGODB_URI is set (e.g. in CI
 * against a real MongoDB) it is used directly; otherwise an ephemeral in-memory
 * MongoDB is spun up via mongodb-memory-server so tests run with zero setup.
 *
 * @returns {Promise<import('mongodb-memory-server').MongoMemoryServer|null>}
 */
async function setupMongoTest() {
  let uri = process.env.TEST_MONGODB_URI;

  if (!uri) {
    // Lazy-require so the dependency is only loaded when we actually need to
    // start an in-memory server (not when an external test DB is provided).
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }

  process.env.MONGODB_URI = uri;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  return memoryServer;
}

async function cleanupMongoTest(server) {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
    await mongoose.disconnect();
  }

  const target = server || memoryServer;
  if (target) {
    await target.stop();
    memoryServer = null;
  }
}

module.exports = {
  setupMongoTest,
  cleanupMongoTest
};
