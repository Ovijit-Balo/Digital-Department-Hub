import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function RoleGuard({ children, roles = [] }) {
  const location = useLocation();
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles.length && !hasRole(...roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RoleGuard;
