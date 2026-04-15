import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const adminLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/news', label: 'Content View' },
  { to: '/scholarship', label: 'Scholarship Desk' },
  { to: '/events', label: 'Event Desk' },
  { to: '/booking', label: 'Venue Desk' }
];

function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div>
          <h2>Control Center</h2>
          <p className="sidebar-caption">Signed in as {user?.fullName}</p>
        </div>

        <nav className="admin-nav">
          {adminLinks.map((link) => (
            <Link key={link.to} to={link.to} className="admin-nav-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}

export default AdminLayout;
