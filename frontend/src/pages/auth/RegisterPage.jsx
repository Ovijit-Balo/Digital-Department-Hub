import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
      const fallback = user.roles.some((role) => ['admin', 'editor', 'manager'].includes(role))
        ? '/admin'
        : '/';
      navigate(location.state?.from || fallback, { replace: true });
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
        <p>Register your account to use the Digital Department Hub.</p>

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
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </section>
  );
}

export default RegisterPage;
