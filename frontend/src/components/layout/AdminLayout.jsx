import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ACCESS_CONTROL_VIEW_ROLES,
  ADMIN_PANEL_ROLES,
  CMS_STUDIO_ROLES,
  ROLES,
  STAFF_DASHBOARD_ROLES,
  TEACHER_DASHBOARD_ROLES,
  getPrimaryPortalForUser
} from '../../constants/roles';
import { useThemeContext } from '../../context/ThemeContext';

const navItems = [
  { to: '/admin', label: 'Admin Dashboard', roles: [ROLES.ADMIN] },
  { to: '/admin/teacher', label: 'Teacher Dashboard', roles: TEACHER_DASHBOARD_ROLES },
  { to: '/admin/staff', label: 'Staff Dashboard', roles: STAFF_DASHBOARD_ROLES },
  { to: '/admin/cms', label: 'CMS Studio', roles: CMS_STUDIO_ROLES },
  { to: '/admin/notifications', label: 'Notifications', roles: ADMIN_PANEL_ROLES },
  { to: '/news', label: 'Content View', roles: ADMIN_PANEL_ROLES },
  { to: '/scholarship', label: 'Scholarship Desk', roles: ADMIN_PANEL_ROLES },
  { to: '/events', label: 'Event Desk', roles: ADMIN_PANEL_ROLES },
  { to: '/booking', label: 'Venue Desk', roles: ADMIN_PANEL_ROLES },
  { to: '/admin/access', label: 'Access Control', roles: ACCESS_CONTROL_VIEW_ROLES }
];

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeContext();
  const primaryPortal = getPrimaryPortalForUser(user);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const links = useMemo(() => navItems.filter((item) => hasRole(...item.roles)), [hasRole]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    const redirectPath = primaryPortal?.loginPath || '/portals';
    logout();
    navigate(redirectPath, { replace: true });
  };

  return (
    <div className={`admin-layout${mobileSidebarOpen ? ' admin-layout--drawer-open' : ''}`}>
      <aside
        className={`admin-sidebar${sidebarCollapsed ? ' is-collapsed' : ''}${mobileSidebarOpen ? ' is-open' : ''}`}
      >
        <div className="admin-sidebar-head">
          <div>
            <p className="eyebrow">Enterprise Control Center</p>
            <h2>Digital Department Hub</h2>
            <p className="sidebar-caption">Signed in as {user?.fullName}</p>
            {primaryPortal && <p className="sidebar-caption">Portal: {primaryPortal.label}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="admin-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-actions">
          <Link to="/profile" className="btn btn-ghost admin-action-btn">
            Profile
          </Link>
          <button type="button" className="btn btn-ghost admin-action-btn" onClick={toggleTheme}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <Link to="/" className="btn btn-ghost admin-action-btn">
            Public Site
          </Link>
          <button
            type="button"
            className="btn btn-primary admin-action-btn"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="icon-button admin-topbar__menu"
            onClick={() => setMobileSidebarOpen((open) => !open)}
            aria-label="Open navigation"
          >
            ☰
          </button>
          <div className="admin-topbar-copy">
            <p className="meta">Role-aware workspace</p>
            <h1>University ERP Command Deck</h1>
          </div>
          <div className="admin-topbar-actions">
            <Link to="/profile" className="btn btn-ghost">
              Profile
            </Link>
            <button type="button" className="theme-toggle" onClick={toggleTheme}>
              {isDark ? 'Light' : 'Dark'}
            </button>
            <Link to="/admin/notifications" className="btn btn-ghost">
              Notifications
            </Link>
          </div>
        </header>

        <section className="admin-content">
          <Outlet />
        </section>
      </div>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="admin-backdrop"
          aria-label="Close sidebar"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default AdminLayout;
