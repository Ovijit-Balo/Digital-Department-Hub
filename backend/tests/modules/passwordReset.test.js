const crypto = require('crypto');

// Mock the data-access + email collaborators so the reset logic can be tested
// without a database (same approach as notificationEvents.test.js).
jest.mock('../../src/modules/auth/user.model', () => ({
  findOne: jest.fn()
}));
jest.mock('../../src/modules/auth/refreshToken.model', () => ({
  updateMany: jest.fn().mockResolvedValue({})
}));
jest.mock('../../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({})
}));

const User = require('../../src/modules/auth/user.model');
const RefreshToken = require('../../src/modules/auth/refreshToken.model');
const EmailService = require('../../src/services/emailService');
const authService = require('../../src/modules/auth/auth.service');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// findOne(...).select(...) is used in confirmPasswordReset; make the mock
// return an object exposing .select() that resolves to the given user.
const findOneResolving = (user) => {
  User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
};

describe('Password reset flow (FR-PA-047)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPasswordReset', () => {
    it('issues a hashed, time-limited token and emails the raw token to an active user', async () => {
      const user = {
        email: 'admin@example.com',
        isActive: true,
        save: jest.fn().mockResolvedValue(undefined)
      };
      User.findOne.mockResolvedValue(user);

      const result = await authService.requestPasswordReset({ email: 'Admin@Example.com' });

      // Query is case-insensitive on email.
      expect(User.findOne).toHaveBeenCalledWith({ email: 'admin@example.com' });
      // A token hash + future expiry were persisted.
      expect(user.passwordResetTokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(user.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
      expect(user.save).toHaveBeenCalledTimes(1);

      // The RAW token (not the stored hash) is emailed, and hashing it back
      // matches what was stored.
      const [, rawToken] = EmailService.sendPasswordResetEmail.mock.calls[0];
      expect(sha256(rawToken)).toBe(user.passwordResetTokenHash);
      // Generic, non-enumerating response.
      expect(result.message).toMatch(/if an account exists/i);
    });

    it('does not email or throw for an unknown address, and returns the same generic message', async () => {
      User.findOne.mockResolvedValue(null);

      const result = await authService.requestPasswordReset({ email: 'nobody@example.com' });

      expect(EmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result.message).toMatch(/if an account exists/i);
    });

    it('skips deactivated accounts (no token issued, no email)', async () => {
      const user = { email: 'x@example.com', isActive: false, save: jest.fn() };
      User.findOne.mockResolvedValue(user);

      await authService.requestPasswordReset({ email: 'x@example.com' });

      expect(user.save).not.toHaveBeenCalled();
      expect(EmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('confirmPasswordReset', () => {
    it('sets a new password, clears the token, and revokes existing sessions for a valid token', async () => {
      const user = {
        _id: 'user-1',
        passwordHash: 'old-hash',
        passwordResetTokenHash: 'stored',
        passwordResetExpires: new Date(Date.now() + 1000),
        save: jest.fn().mockResolvedValue(undefined)
      };
      findOneResolving(user);

      const result = await authService.confirmPasswordReset({
        token: 'raw-token',
        newPassword: 'BrandNewPass1'
      });

      // Looked up by the hash of the supplied token, gated on a future expiry.
      const filter = User.findOne.mock.calls[0][0];
      expect(filter.passwordResetTokenHash).toBe(sha256('raw-token'));
      expect(filter.passwordResetExpires.$gt).toBeInstanceOf(Date);

      // Password replaced (bcrypt hash, not the plaintext), reset fields cleared.
      expect(user.passwordHash).not.toBe('old-hash');
      expect(user.passwordHash).not.toBe('BrandNewPass1');
      expect(user.passwordResetTokenHash).toBeUndefined();
      expect(user.passwordResetExpires).toBeUndefined();
      expect(user.save).toHaveBeenCalledTimes(1);

      // All active sessions invalidated.
      expect(RefreshToken.updateMany).toHaveBeenCalledWith(
        { user: 'user-1', revoked: false },
        { $set: { revoked: true } }
      );
      expect(result.message).toMatch(/password has been reset/i);
    });

    it('rejects an invalid or expired token', async () => {
      findOneResolving(null);

      await expect(
        authService.confirmPasswordReset({ token: 'bad', newPassword: 'BrandNewPass1' })
      ).rejects.toThrow(/invalid or expired/i);

      expect(RefreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
