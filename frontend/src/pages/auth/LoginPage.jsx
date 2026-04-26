import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  PORTAL_DEFINITIONS,
  PORTAL_KEYS,
  getDefaultWorkspaceForUser,
  getPortalDefinition,
  getPrimaryPortalForUser,
  userCanAccessPortal
} from '../../constants/roles';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { portal } = useParams();
  const { login, logout } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedPortal = useMemo(() => getPortalDefinition(portal), [portal]);
  const portalLinks = useMemo(
    () => PORTAL_KEYS.map((portalKey) => PORTAL_DEFINITIONS[portalKey]),
    []
  );

  const onChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(form);

      if (selectedPortal && !userCanAccessPortal(user, selectedPortal.key)) {
        const assignedPortal = getPrimaryPortalForUser(user);

        logout();
        setError(
          assignedPortal
            ? `This account is assigned to the ${assignedPortal.label} portal. Use ${assignedPortal.loginPath} to continue.`
            : 'This account has no eligible portal assignment. Contact an administrator.'
        );
        return;
      }

      navigate(location.state?.from || getDefaultWorkspaceForUser(user), { replace: true });
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>{selectedPortal ? `${selectedPortal.label} Sign In` : 'Sign In'}</h1>
        <p>
          {selectedPortal
            ? selectedPortal.description
            : 'Use your institutional account to access the Digital Department Hub.'}
        </p>

        <div className="portal-switch-wrap">
          <p className="meta">Choose portal</p>
          <div className="portal-pill-row">
            {portalLinks.map((portalItem) => (
              <Link
                key={portalItem.key}
                to={portalItem.loginPath}
                className={`portal-pill ${selectedPortal?.key === portalItem.key ? 'is-active' : ''}`}
              >
                {portalItem.label}
              </Link>
            ))}
          </div>
        </div>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          value={form.email}
          onChange={onChange}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={onChange}
          required
        />

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing In...' : 'Sign In'}
        </button>

        {selectedPortal && (
          <p className="meta">
            Post-login workspace: {selectedPortal.workspaceLabel}
          </p>
        )}

        {selectedPortal?.key === 'student' || !selectedPortal ? (
          <p>
            Need a student account? <Link to="/register">Create one</Link>
          </p>
        ) : (
          <p className="meta">
            Admin, Teacher, and Staff accounts are provisioned by system administrators.
          </p>
        )}

        <p>
          Need help choosing? <Link to="/portals">Open Portal Guide</Link>
        </p>
      </form>
    </section>
  );
}

export default LoginPage;
