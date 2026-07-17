import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultWorkspaceForUser } from '../../constants/roles';
import AdminPanelPage from './AdminPanelPage';

function AdminLandingPage() {
  const { user, hasRole } = useAuth();

  if (hasRole('admin')) {
    return <AdminPanelPage />;
  }

  return <Navigate to={getDefaultWorkspaceForUser(user)} replace />;
}

export default AdminLandingPage;
