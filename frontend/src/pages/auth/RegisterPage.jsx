import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultWorkspaceForUser } from '../../constants/roles';

const getPasswordStrength = (password) => {
  if (!password) {
    return { label: 'Too short', key: 'too-short', score: 0 };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: 'Weak', key: 'weak', score };
  if (score <= 3) return { label: 'Moderate', key: 'moderate', score };

  return { label: 'Strong', key: 'strong', score };
};

function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    department: '',
    languagePreference: 'en'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

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
      const payload = {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        department: form.department || undefined,
        languagePreference: form.languagePreference
      };

      const user = await register(payload);
      navigate(location.state?.from || getDefaultWorkspaceForUser(user), { replace: true });
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create Account</h1>
        <p>Student self-service account registration for the Digital Department Hub.</p>
        <p className="meta">New registrations are assigned the Student role by default.</p>

        <label htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          type="text"
          name="fullName"
          autoComplete="name"
          value={form.fullName}
          onChange={onChange}
          minLength={2}
          maxLength={120}
          required
        />

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
          autoComplete="new-password"
          value={form.password}
          onChange={onChange}
          minLength={8}
          required
        />

        <div className="password-strength" aria-live="polite">
          <div className="password-strength__bar">
            <span
              className={`password-strength__fill password-strength__fill--${passwordStrength.key}`}
              style={{ width: `${Math.max(passwordStrength.score, 1) * 20}%` }}
            />
          </div>
          <p className="meta">Password strength: {passwordStrength.label}</p>
        </div>

        <label htmlFor="department">Department (optional)</label>
        <input
          id="department"
          type="text"
          name="department"
          value={form.department}
          onChange={onChange}
          maxLength={120}
        />

        <label htmlFor="languagePreference">Language</label>
        <select
          id="languagePreference"
          name="languagePreference"
          value={form.languagePreference}
          onChange={onChange}
        >
          <option value="en">English</option>
          <option value="bn">Bangla</option>
        </select>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <p>
          Already have an account? <Link to="/login/student">Sign In</Link>
        </p>

        <p>
          Admin, Teacher, or Staff account? <Link to="/portals">Open Portal Guide</Link>
        </p>
      </form>
    </section>
  );
}

export default RegisterPage;
