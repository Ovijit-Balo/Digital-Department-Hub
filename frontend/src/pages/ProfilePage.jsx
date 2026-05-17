import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useLanguage from '../hooks/useLanguage';
import { ui } from '../i18n/publicUi';
import { getPrimaryPortalForUser, getDefaultWorkspaceForUser } from '../constants/roles';
import { toLocalDateTime } from '../utils/localized';

export function ProfilePage() {
  const { language } = useLanguage();
  const { user, decodedToken, logout } = useAuth();

  const primaryPortal = getPrimaryPortalForUser(user);
  const workspacePath = getDefaultWorkspaceForUser(user);
  const tokenExpiresAt = decodedToken?.exp ? new Date(decodedToken.exp * 1000) : null;

  if (!user) {
    return null;
  }

  return (
    <section className="page-wrap">
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
