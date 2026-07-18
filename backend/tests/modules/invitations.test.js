const crypto = require('crypto');

// Mock the data-access + email collaborators so invitation logic can be tested
// without a database (same approach as passwordReset.test.js).
jest.mock('../../src/modules/auth/user.model', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));
jest.mock('../../src/modules/auth/invitation.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn().mockResolvedValue({})
}));
jest.mock('../../src/modules/auth/refreshToken.model', () => ({
  create: jest.fn().mockResolvedValue({}),
  updateMany: jest.fn().mockResolvedValue({})
}));
jest.mock('../../src/services/emailService', () => ({
  sendInvitationEmail: jest.fn().mockResolvedValue({})
}));
jest.mock('../../src/utils/jwt', () => ({
  signAccessToken: jest.fn().mockReturnValue('signed-access-token')
}));

const User = require('../../src/modules/auth/user.model');
const Invitation = require('../../src/modules/auth/invitation.model');
const EmailService = require('../../src/services/emailService');
const authService = require('../../src/modules/auth/auth.service');
const { ROLES } = require('../../src/config/roles');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// findOne(...).select(...) is used in acceptInvitation; make the mock return an
// object exposing .select() that resolves to the given invitation.
const findOneSelecting = (invitation) => {
  Invitation.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(invitation) });
};

describe('Account invitations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    it('issues a hashed, time-limited invite and emails the raw token', async () => {
      User.findOne.mockResolvedValue(null); // no existing account
      const created = {
        _id: 'invite-1',
        email: 'teacher@example.com',
        roles: [ROLES.EDITOR],
        status: 'pending'
      };
      Invitation.create.mockResolvedValue(created);

      const result = await authService.createInvitation({
        actorId: 'admin-1',
        email: 'Teacher@Example.com',
        roles: [ROLES.EDITOR]
      });

      // Any earlier pending invite for this email is superseded.
      expect(Invitation.updateMany).toHaveBeenCalledWith(
        { email: 'teacher@example.com', status: 'pending' },
        { $set: { status: 'revoked' } }
      );

      // The stored token is a hash; the raw token is emailed and hashes back to it.
      const createArgs = Invitation.create.mock.calls[0][0];
      expect(createArgs.email).toBe('teacher@example.com');
      expect(createArgs.roles).toEqual([ROLES.EDITOR]);
      expect(createArgs.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(createArgs.expiresAt.getTime()).toBeGreaterThan(Date.now());

      const [, rawToken] = EmailService.sendInvitationEmail.mock.calls[0];
      expect(sha256(rawToken)).toBe(createArgs.tokenHash);
      expect(result.email).toBe('teacher@example.com');
    });

    it('rejects inviting an email that already has an account', async () => {
      User.findOne.mockResolvedValue({ _id: 'existing', email: 'taken@example.com' });

      await expect(
        authService.createInvitation({
          actorId: 'admin-1',
          email: 'taken@example.com',
          roles: [ROLES.EDITOR]
        })
      ).rejects.toThrow(/already exists/i);

      expect(Invitation.create).not.toHaveBeenCalled();
      expect(EmailService.sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('rejects an unknown role', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(
        authService.createInvitation({
          actorId: 'admin-1',
          email: 'x@example.com',
          roles: ['superuser']
        })
      ).rejects.toThrow(/unknown role/i);
    });
  });

  describe('acceptInvitation', () => {
    it('creates a user with the invited roles and marks the invite accepted', async () => {
      const invitation = {
        _id: 'invite-1',
        email: 'teacher@example.com',
        roles: [ROLES.EDITOR],
        fullName: 'Invited Teacher',
        department: 'CSE',
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined)
      };
      findOneSelecting(invitation);
      User.findOne.mockResolvedValue(null); // email not claimed in the interim
      User.create.mockResolvedValue({
        _id: 'user-1',
        fullName: 'Real Name',
        email: 'teacher@example.com',
        roles: [ROLES.EDITOR]
      });

      const result = await authService.acceptInvitation({
        token: 'raw-token',
        fullName: 'Real Name',
        password: 'BrandNewPass1'
      });

      // Looked up by the hash of the supplied token, gated on pending + future expiry.
      const filter = Invitation.findOne.mock.calls[0][0];
      expect(filter.tokenHash).toBe(sha256('raw-token'));
      expect(filter.status).toBe('pending');
      expect(filter.expiresAt.$gt).toBeInstanceOf(Date);

      // The new user gets exactly the invited roles, and the password is hashed.
      const createArgs = User.create.mock.calls[0][0];
      expect(createArgs.roles).toEqual([ROLES.EDITOR]);
      expect(createArgs.email).toBe('teacher@example.com');
      expect(createArgs.passwordHash).not.toBe('BrandNewPass1');

      expect(invitation.status).toBe('accepted');
      expect(invitation.acceptedAt).toBeInstanceOf(Date);
      expect(invitation.save).toHaveBeenCalled();

      expect(result.token).toBe('signed-access-token');
      expect(result.user.roles).toEqual([ROLES.EDITOR]);
    });

    it('rejects an invalid or expired invitation', async () => {
      findOneSelecting(null);

      await expect(
        authService.acceptInvitation({
          token: 'bad',
          fullName: 'Name',
          password: 'BrandNewPass1'
        })
      ).rejects.toThrow(/invalid or has expired/i);

      expect(User.create).not.toHaveBeenCalled();
    });

    it('revokes the invite and refuses if the email was claimed in the interim', async () => {
      const invitation = {
        _id: 'invite-1',
        email: 'teacher@example.com',
        roles: [ROLES.EDITOR],
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined)
      };
      findOneSelecting(invitation);
      User.findOne.mockResolvedValue({ _id: 'sneaky', email: 'teacher@example.com' });

      await expect(
        authService.acceptInvitation({
          token: 'raw-token',
          fullName: 'Name',
          password: 'BrandNewPass1'
        })
      ).rejects.toThrow(/already exists/i);

      expect(invitation.status).toBe('revoked');
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('revokeInvitation', () => {
    it('marks a pending invitation as revoked', async () => {
      const invitation = {
        _id: 'invite-1',
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined)
      };
      Invitation.findById = jest.fn().mockResolvedValue(invitation);

      const result = await authService.revokeInvitation({ invitationId: 'invite-1' });

      expect(invitation.status).toBe('revoked');
      expect(invitation.save).toHaveBeenCalled();
      expect(result.status).toBe('revoked');
    });

    it('refuses to revoke an already-accepted invitation', async () => {
      Invitation.findById = jest.fn().mockResolvedValue({ _id: 'i', status: 'accepted' });

      await expect(
        authService.revokeInvitation({ invitationId: 'i' })
      ).rejects.toThrow(/already been accepted/i);
    });
  });

  describe('getInvitationByToken', () => {
    it('reports "invalid" when no invitation matches the token', async () => {
      Invitation.findOne.mockResolvedValue(null);

      const result = await authService.getInvitationByToken('nope');

      expect(result.state).toBe('invalid');
      expect(Invitation.findOne.mock.calls[0][0].tokenHash).toBe(sha256('nope'));
    });

    it('reports "accepted" for an already-used invitation without consuming it', async () => {
      Invitation.findOne.mockResolvedValue({
        email: 'teacher@example.com',
        status: 'accepted',
        expiresAt: new Date(Date.now() + 1000)
      });

      const result = await authService.getInvitationByToken('raw-token');

      expect(result.state).toBe('accepted');
      expect(result.email).toBe('teacher@example.com');
    });

    it('reports "expired" for a pending invitation past its expiry', async () => {
      Invitation.findOne.mockResolvedValue({
        email: 'teacher@example.com',
        status: 'pending',
        roles: [ROLES.EDITOR],
        expiresAt: new Date(Date.now() - 1000)
      });

      const result = await authService.getInvitationByToken('raw-token');

      expect(result.state).toBe('expired');
    });

    it('returns "pending" with roles for a live invitation', async () => {
      Invitation.findOne.mockResolvedValue({
        email: 'teacher@example.com',
        status: 'pending',
        roles: [ROLES.EDITOR],
        fullName: 'Prefilled Name',
        expiresAt: new Date(Date.now() + 60 * 1000)
      });

      const result = await authService.getInvitationByToken('raw-token');

      expect(result.state).toBe('pending');
      expect(result.roles).toEqual([ROLES.EDITOR]);
      expect(result.fullName).toBe('Prefilled Name');
    });
  });
});
