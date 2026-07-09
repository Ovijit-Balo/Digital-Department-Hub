import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useThemeContext } from '../../context/ThemeContext';
import useLanguage from '../../hooks/useLanguage';
import { toLocalizedText } from '../../utils/localized';
import { ui } from '../../i18n/publicUi';
import {
  ACCESS_CONTROL_VIEW_ROLES,
  ADMIN_PANEL_ROLES,
  CMS_STUDIO_ROLES,
  NOTIFICATION_CENTER_ROLES,
  ROLES,
  STAFF_DASHBOARD_ROLES,
  STUDENT_DASHBOARD_ROLES,
  TEACHER_DASHBOARD_ROLES,
  getPrimaryPortalForUser
} from '../../constants/roles';

// Role-aware workspace navigation. Each entry renders only for users whose role
// is listed — so a student sees a short set, an admin sees the full set. These
// mirror the destinations that were previously in the admin sidebar.
const WORKSPACE_NAV = [
  { to: '/admin', label: 'Dashboard', roles: [ROLES.ADMIN], end: true },
  { to: '/admin/teacher', label: 'Teacher', roles: TEACHER_DASHBOARD_ROLES },
  { to: '/admin/staff', label: 'Staff', roles: STAFF_DASHBOARD_ROLES },
  { to: '/student', label: 'Dashboard', roles: STUDENT_DASHBOARD_ROLES, end: true },
  { to: '/admin/cms', label: 'CMS Studio', roles: CMS_STUDIO_ROLES },
  { to: '/admin/notifications', label: 'Notifications', roles: NOTIFICATION_CENTER_ROLES },
  { to: '/admin/access', label: 'Access Control', roles: ACCESS_CONTROL_VIEW_ROLES },
  {
    to: '/scholarship',
    label: 'Scholarships',
    roles: [...ADMIN_PANEL_ROLES, ...STUDENT_DASHBOARD_ROLES]
  },
  { to: '/events', label: 'Events', roles: [...ADMIN_PANEL_ROLES, ...STUDENT_DASHBOARD_ROLES] },
  { to: '/booking', label: 'Booking', roles: [...ADMIN_PANEL_ROLES, ...STUDENT_DASHBOARD_ROLES] }
];

function WorkspaceLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeContext();
  const { language, setLanguage } = useLanguage();
  const primaryPortal = getPrimaryPortalForUser(user);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = WORKSPACE_NAV.filter((item) => hasRole(...item.roles));

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    const redirectPath = primaryPortal?.loginPath || '/portals';
    logout();
    navigate(redirectPath, { replace: true });
  };

  const portalLabel = primaryPortal
    ? toLocalizedText(
        { en: `${primaryPortal.label} Workspace`, bn: `${primaryPortal.label} ওয়ার্কস্পেস` },
        language
      )
    : toLocalizedText({ en: 'Workspace', bn: 'ওয়ার্কস্পেস' }, language);

  const navLinkClass = ({ isActive }) => `workspace-link${isActive ? ' is-active' : ''}`;

  return (
    <div className="workspace-shell">
      <header className={`workspace-topbar${drawerOpen ? ' is-drawer-open' : ''}`}>
        <div className="workspace-brand-wrap">
          <Link to={primaryPortal?.workspacePath || '/'} className="workspace-brand">
            <span className="workspace-brand__dept">{ui('brand', 'department', language)}</span>
            <span className="workspace-brand__portal">{portalLabel}</span>
          </Link>
        </div>

        <button
          type="button"
          className="nav-toggle workspace-toggle"
          aria-expanded={drawerOpen}
          aria-controls="workspace-nav"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          {toLocalizedText({ en: 'Menu', bn: 'মেনু' }, language)}
        </button>

        <nav id="workspace-nav" className="workspace-nav" aria-label="Workspace">
          {links.map((item) => (
            <NavLink key={`${item.to}-${item.label}`} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="workspace-actions">
          <label className="lang-switch" htmlFor="workspace-language">
            <span>{toLocalizedText({ en: 'Language', bn: 'ভাষা' }, language)}</span>
            <select
              id="workspace-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">EN</option>
              <option value="bn">BN</option>
            </select>
          </label>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <Link to="/" className="btn btn-ghost workspace-viewsite">
            {toLocalizedText({ en: 'View public site', bn: 'পাবলিক সাইট' }, language)}
          </Link>
          <Link to="/profile" className="user-chip">
            {user?.fullName}
            {primaryPortal ? ` • ${primaryPortal.label}` : ''}
          </Link>
          <button type="button" className="btn btn-primary" onClick={handleSignOut}>
            {toLocalizedText({ en: 'Sign Out', bn: 'সাইন আউট' }, language)}
          </button>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="workspace-content">
        <Outlet />
      </main>
    </div>
  );
}

export default WorkspaceLayout;
