import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import { getPrimaryPortalForUser } from '../../constants/roles';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/portals', label: 'Portals' },
  { to: '/pages', label: 'Pages' },
  { to: '/news', label: 'News' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/blogs', label: 'Blog' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/scholarship', label: 'Scholarship' },
  { to: '/events', label: 'Events' },
  { to: '/booking', label: 'Booking' },
  { to: '/contact', label: 'Contact' }
];

function PublicLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const primaryPortal = getPrimaryPortalForUser(user);

  const workspaceLabel = primaryPortal ? `${primaryPortal.label} Workspace` : '';

  const handleSignOut = () => {
    const redirectPath = primaryPortal?.loginPath || '/portals';
    logout();
    navigate(redirectPath, { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand-wrap">
          <Link to="/" className="brand-link">
            Digital Department Hub
          </Link>
          <span className="brand-subtitle">Department-wide digital operations platform</span>
        </div>

        <nav className="nav-links">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="nav-link">
              {link.label}
            </Link>
          ))}
          {primaryPortal && (
            <Link to={primaryPortal.workspacePath} className="nav-link nav-admin-link">
              {workspaceLabel}
            </Link>
          )}
        </nav>

        <div className="auth-actions">
          <label className="lang-switch" htmlFor="ui-language">
            <span>Language</span>
            <select
              id="ui-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">EN</option>
              <option value="bn">BN</option>
            </select>
          </label>

          {user ? (
            <>
              <span className="user-chip">
                {user.fullName}
                {primaryPortal ? ` • ${primaryPortal.label}` : ''}
              </span>
              <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
                Sign Out
              </button>
            </>
          ) : (
            <div className="guest-auth-actions">
              <Link to="/register" className="btn btn-ghost">
                Register
              </Link>
              <Link to="/portals" className="btn btn-primary">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="public-content">
        <Outlet />
      </main>

      <footer className="footer">
        <p>Digital Department Hub • Built for operational transparency and student service excellence</p>
      </footer>
    </div>
  );
}

export default PublicLayout;
