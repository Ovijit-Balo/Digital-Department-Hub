import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  PORTAL_DEFINITIONS,
  PORTAL_KEYS,
  getDefaultWorkspaceForUser,
  getPrimaryPortalForUser
} from '../../constants/roles';

function PortalsPage() {
  const { isAuthenticated, user } = useAuth();

  const primaryPortal = getPrimaryPortalForUser(user);
  const workspacePath = getDefaultWorkspaceForUser(user);

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>Portal Sign-In Guide</h1>
      </div>

      <p className="meta">
        Choose the correct login page for your assigned role so you land in the right workspace
        immediately after sign-in.
      </p>

      <div className="portal-grid">
        {PORTAL_KEYS.map((portalKey) => {
          const portal = PORTAL_DEFINITIONS[portalKey];

          return (
            <article key={portal.key} className="surface-card portal-card">
              <h3>{portal.label} Portal</h3>
              <p>{portal.description}</p>
              <p className="meta">Workspace: {portal.workspaceLabel}</p>
              <Link to={portal.loginPath} className="btn btn-primary">
                Sign In as {portal.label}
              </Link>
            </article>
          );
        })}
      </div>

      {isAuthenticated && (
        <article className="surface-card portal-current-session">
          <h3>Current Session</h3>
          <p>
            Signed in as <strong>{user?.fullName || 'User'}</strong>
            {primaryPortal ? ` (${primaryPortal.label})` : ''}.
          </p>
          <div className="action-row">
            <Link to={workspacePath} className="btn btn-ghost">
              Go to My Workspace
            </Link>
            {primaryPortal && (
              <Link to={primaryPortal.loginPath} className="btn btn-ghost">
                Open My Login Page
              </Link>
            )}
          </div>
        </article>
      )}
    </section>
  );
}

export default PortalsPage;
