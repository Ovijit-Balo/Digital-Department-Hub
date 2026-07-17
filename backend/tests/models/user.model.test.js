const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../../src/modules/auth/user.model');
const { setupMongoTest, cleanupMongoTest } = require('../helpers/mongoTest');

let mongoServer;

beforeAll(async () => {
  mongoServer = await setupMongoTest();
});

describe('User model', () => {
  afterEach(async () => {
    const collections = mongoose.connection.collections;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await cleanupMongoTest(mongoServer);
  });

  it('persists users in the in-memory database and compares passwords', async () => {
    const passwordHash = await bcrypt.hash('CorrectHorseBatteryStaple!1', 10);

    const user = await User.create({
      fullName: 'Test User',
      email: 'test.user@example.com',
      passwordHash,
      roles: ['student']
    });

    const storedUser = await User.findById(user._id).select('+passwordHash');

    expect(storedUser).not.toBeNull();
    expect(storedUser.email).toBe('test.user@example.com');
    expect(await storedUser.comparePassword('CorrectHorseBatteryStaple!1')).toBe(true);
    expect(await storedUser.comparePassword('wrong-password')).toBe(false);
  });
});
