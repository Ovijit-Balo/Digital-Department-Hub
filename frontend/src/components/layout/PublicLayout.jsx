import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/news', label: 'News' },
  { to: '/scholarship', label: 'Scholarship' },
  { to: '/events', label: 'Events' },
  { to: '/booking', label: 'Booking' }
];

function PublicLayout() {
  const { user, hasRole, logout } = useAuth();
  const { language, setLanguage } = useLanguage();

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
          {hasRole('admin', 'editor', 'manager') && (
            <Link to="/admin" className="nav-link nav-admin-link">
              Admin Panel
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
              <span className="user-chip">{user.fullName}</span>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Sign Out
              </button>
            </>
          ) : (
            <div className="guest-auth-actions">
              <Link to="/register" className="btn btn-ghost">
                Register
              </Link>
              <Link to="/login" className="btn btn-primary">
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
