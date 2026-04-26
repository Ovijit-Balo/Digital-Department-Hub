import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultWorkspaceForUser } from '../../constants/roles';

function RoleGuard({ children, roles = [], loginPath = '/login' }) {
  const location = useLocation();
  const { user, isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  if (roles.length && !hasRole(...roles)) {
    return <Navigate to={getDefaultWorkspaceForUser(user)} replace />;
  }

  return children;
}

export default RoleGuard;
