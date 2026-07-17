import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const links = WORKSPACE_NAV.filter((item) => hasRole(...item.roles));

  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  const userInitials = useMemo(() => {
    if (!user?.fullName) return 'U';
    const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'U';
  }, [user]);

  const handleSignOut = () => {
    const redirectPath = primaryPortal?.loginPath || '/portals';
    setUserMenuOpen(false);
    logout();
    navigate(redirectPath, { replace: true });
  };

  const handleUserMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      setUserMenuOpen(false);
    }
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

        <nav id="workspace-nav" className="workspace-nav" aria-label={toLocalizedText({ en: 'Workspace', bn: 'ওয়ার্কস্পেস' }, language)}>
          {links.map((item) => (
            <NavLink key={`${item.to}-${item.label}`} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="workspace-actions">
          <label className="lang-switch lang-switch--compact" htmlFor="workspace-language">
            <span className="sr-only">
              {toLocalizedText({ en: 'Language', bn: 'ভাষা' }, language)}
            </span>
            <select
              id="workspace-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">EN</option>
              <option value="bn">বাং</option>
            </select>
          </label>
          <button
            type="button"
            className="theme-toggle theme-toggle--icon"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <Link to="/" className="btn btn-ghost workspace-viewsite">
            {toLocalizedText({ en: 'View public site', bn: 'পাবলিক সাইট' }, language)}
          </Link>
          <div className={`user-menu${userMenuOpen ? ' user-menu--open' : ''}`} ref={userMenuRef}>
            <button
              type="button"
              className="user-menu__trigger"
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((open) => !open)}
              onKeyDown={handleUserMenuKeyDown}
            >
              <span className="user-menu__avatar" aria-hidden="true">
                {userInitials}
              </span>
              <span className="user-menu__name">{user?.fullName}</span>
              <span className="user-menu__caret" aria-hidden="true" />
            </button>
            {userMenuOpen && (
              <div
                className="user-menu__panel"
                role="menu"
                tabIndex={-1}
                onKeyDown={handleUserMenuKeyDown}
              >
                <div className="user-menu__meta">
                  <strong>{user?.fullName}</strong>
                  {primaryPortal && <span>{primaryPortal.label}</span>}
                </div>
                <Link
                  to="/profile"
                  className="user-menu__item"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  {toLocalizedText({ en: 'My Profile', bn: 'আমার প্রোফাইল' }, language)}
                </Link>
                <hr className="user-menu__divider" />
                <button
                  type="button"
                  className="user-menu__item user-menu__item--danger"
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  {toLocalizedText({ en: 'Sign Out', bn: 'সাইন আউট' }, language)}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="workspace-content">
        <Outlet />
      </main>
    </div>
  );
}

export default WorkspaceLayout;
