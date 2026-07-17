import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/modules';
import { useAuth } from '../context/AuthContext';
import useLanguage from '../hooks/useLanguage';
import { ui } from '../i18n/publicUi';
import { getPrimaryPortalForUser, getDefaultWorkspaceForUser } from '../constants/roles';
import { getApiErrorMessage } from '../utils/http';
import { toLocalDateTime, toLocalizedText } from '../utils/localized';

const PW = {
  minLength: { en: 'New password must be at least 8 characters.', bn: 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।' },
  mismatch: { en: 'New password and confirmation do not match.', bn: 'নতুন পাসওয়ার্ড ও নিশ্চিতকরণ মেলেনি।' },
  changed: {
    en: 'Password changed. Other sessions have been signed out; use the new password next time you sign in.',
    bn: 'পাসওয়ার্ড পরিবর্তিত হয়েছে। অন্যান্য সেশন সাইন আউট হয়েছে; পরবর্তী সাইন ইনে নতুন পাসওয়ার্ড ব্যবহার করুন।'
  },
  failed: { en: 'Failed to change password.', bn: 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ।' },
  heading: { en: 'Change Password', bn: 'পাসওয়ার্ড পরিবর্তন' },
  hint: {
    en: 'Changing your password signs out all other active sessions immediately.',
    bn: 'পাসওয়ার্ড পরিবর্তন করলে অন্যান্য সক্রিয় সেশন তৎক্ষণাৎ সাইন আউট হয়ে যায়।'
  },
  current: { en: 'Current Password', bn: 'বর্তমান পাসওয়ার্ড' },
  newPw: { en: 'New Password', bn: 'নতুন পাসওয়ার্ড' },
  confirm: { en: 'Confirm New Password', bn: 'নতুন পাসওয়ার্ড নিশ্চিত করুন' },
  changing: { en: 'Changing…', bn: 'পরিবর্তন হচ্ছে…' }
};

export function ProfilePage() {
  const { language } = useLanguage();
  const pt = (key) => toLocalizedText(PW[key], language);
  const { user, decodedToken, logout } = useAuth();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(pt('minLength'));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(pt('mismatch'));
      return;
    }

    setPasswordBusy(true);

    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage(pt('changed'));
    } catch (apiError) {
      setPasswordError(getApiErrorMessage(apiError, pt('failed')));
    } finally {
      setPasswordBusy(false);
    }
  };

  const primaryPortal = getPrimaryPortalForUser(user);
  const workspacePath = getDefaultWorkspaceForUser(user);
  const tokenExpiresAt = decodedToken?.exp ? new Date(decodedToken.exp * 1000) : null;

  if (!user) {
    return null;
  }

  return (
    <section className="page-wrap desk-page profile-page">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">{ui('profile', 'eyebrow', language)}</p>
          <h1>{ui('profile', 'title', language)}</h1>
          <p className="page-title-subtitle">{ui('profile', 'subtitle', language)}</p>
        </div>
        <div className="inline-actions">
          <Link to={workspacePath} className="btn btn-ghost">
            {ui('profile', 'backToWorkspace', language)}
          </Link>
          <button type="button" className="btn btn-primary" onClick={logout}>
            {ui('profile', 'signOut', language)}
          </button>
        </div>
      </header>

      <section className="workflow-grid workflow-grid-2">
        <article className="surface-card">
          <h3>{ui('profile', 'accountTitle', language)}</h3>
          <dl className="details-list">
            <div>
              <dt>{ui('profile', 'name', language)}</dt>
              <dd>{user.fullName}</dd>
            </div>
            <div>
              <dt>{ui('profile', 'email', language)}</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>{ui('profile', 'department', language)}</dt>
              <dd>{user.department || ui('profile', 'notSet', language)}</dd>
            </div>
            <div>
              <dt>{ui('profile', 'language', language)}</dt>
              <dd>{String(user.languagePreference || language).toUpperCase()}</dd>
            </div>
          </dl>
        </article>

        <article className="surface-card">
          <h3>{ui('profile', 'sessionTitle', language)}</h3>
          <dl className="details-list">
            <div>
              <dt>{ui('profile', 'roles', language)}</dt>
              <dd>
                {Array.isArray(user.roles)
                  ? user.roles.join(', ')
                  : ui('profile', 'notSet', language)}
              </dd>
            </div>
            <div>
              <dt>{ui('profile', 'workspace', language)}</dt>
              <dd>{primaryPortal?.workspaceLabel || ui('profile', 'notSet', language)}</dd>
            </div>
            <div>
              <dt>{ui('profile', 'lastLogin', language)}</dt>
              <dd>{toLocalDateTime(user.lastLoginAt)}</dd>
            </div>
            <div>
              <dt>{ui('profile', 'tokenExpiry', language)}</dt>
              <dd>
                {tokenExpiresAt
                  ? toLocalDateTime(tokenExpiresAt)
                  : ui('profile', 'notSet', language)}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <article className="surface-card">
        <h3>{pt('heading')}</h3>
        <p className="meta">{pt('hint')}</p>

        {passwordError && <p className="error-text">{passwordError}</p>}
        {passwordMessage && <p className="meta">{passwordMessage}</p>}

        <form className="form-grid" onSubmit={submitPasswordChange}>
          <label>
            {pt('current')}
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
              }
              required
            />
          </label>
          <label>
            {pt('newPw')}
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
              }
              required
            />
          </label>
          <label>
            {pt('confirm')}
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={passwordBusy}>
            {passwordBusy ? pt('changing') : pt('heading')}
          </button>
        </form>
      </article>

      <article className="surface-card">
        <h3>{ui('profile', 'accessTitle', language)}</h3>
        <p className="meta">{ui('profile', 'accessHint', language)}</p>
        <div className="inline-actions">
          <Link to={workspacePath} className="btn btn-ghost">
            {ui('profile', 'goWorkspace', language)}
          </Link>
          {primaryPortal && (
            <Link to={primaryPortal.loginPath} className="btn btn-ghost">
              {ui('profile', 'switchPortal', language)}
            </Link>
          )}
        </div>
      </article>
    </section>
  );
}

export default ProfilePage;
