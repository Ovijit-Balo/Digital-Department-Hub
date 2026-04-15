import { useAuth } from '../context/AuthContext';

export default function useRole(...roles) {
  const { hasRole } = useAuth();
  return hasRole(...roles);
}
