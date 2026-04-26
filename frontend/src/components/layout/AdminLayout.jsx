import { Link, Outlet, useNavigate } from 'react-router-dom';
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
  const { user, hasRole, logout } = useAuth();
  const primaryPortal = getPrimaryPortalForUser(user);

  const links = navItems.filter((item) => hasRole(...item.roles));

  const handleSignOut = () => {
    const redirectPath = primaryPortal?.loginPath || '/portals';
    logout();
    navigate(redirectPath, { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <h2>Control Center</h2>
          <p className="sidebar-caption">Signed in as {user?.fullName}</p>
          {primaryPortal && <p className="sidebar-caption">Portal: {primaryPortal.label}</p>}
        </div>

        <nav className="admin-nav">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="admin-nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-actions">
          <Link to="/" className="btn btn-ghost admin-action-btn">
            Public Site
          </Link>
          <button type="button" className="btn btn-primary admin-action-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>

      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}

export default AdminLayout;
