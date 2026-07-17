import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import { toLocalizedText } from '../../utils/localized';
import { getDefaultWorkspaceForUser } from '../../constants/roles';
import { validateRegisterForm } from '../../utils/formValidation';

const STRENGTH_LABELS = {
  'too-short': { en: 'Too short', bn: 'খুব ছোট' },
  weak: { en: 'Weak', bn: 'দুর্বল' },
  moderate: { en: 'Moderate', bn: 'মাঝারি' },
  strong: { en: 'Strong', bn: 'শক্তিশালী' }
};

const T = {
  title: { en: 'Create Account', bn: 'অ্যাকাউন্ট তৈরি করুন' },
  lead: {
    en: 'Student self-service account registration for the Digital Department Hub.',
    bn: 'ডিজিটাল ডিপার্টমেন্ট হাবে শিক্ষার্থীদের নিজস্ব অ্যাকাউন্ট রেজিস্ট্রেশন।'
  },
  defaultRole: {
    en: 'New registrations are assigned the Student role by default.',
    bn: 'নতুন রেজিস্ট্রেশনে ডিফল্টভাবে শিক্ষার্থী ভূমিকা বরাদ্দ হয়।'
  },
  fullName: { en: 'Full Name', bn: 'পুরো নাম' },
  email: { en: 'Email', bn: 'ইমেইল' },
  password: { en: 'Password', bn: 'পাসওয়ার্ড' },
  strength: { en: 'Password strength:', bn: 'পাসওয়ার্ডের শক্তি:' },
  department: { en: 'Department (optional)', bn: 'বিভাগ (ঐচ্ছিক)' },
  language: { en: 'Language', bn: 'ভাষা' },
  english: { en: 'English', bn: 'ইংরেজি' },
  bangla: { en: 'Bangla', bn: 'বাংলা' },
  creating: { en: 'Creating Account...', bn: 'অ্যাকাউন্ট তৈরি হচ্ছে...' },
  haveAccount: { en: 'Already have an account?', bn: 'ইতিমধ্যে অ্যাকাউন্ট আছে?' },
  signIn: { en: 'Sign In', bn: 'সাইন ইন' },
  staffAccount: { en: 'Admin, Teacher, or Staff account?', bn: 'অ্যাডমিন, শিক্ষক বা স্টাফ অ্যাকাউন্ট?' },
  openGuide: { en: 'Open Portal Guide', bn: 'পোর্টাল গাইড খুলুন' },
  fixFields: {
    en: 'Please fix the highlighted registration fields.',
    bn: 'অনুগ্রহ করে চিহ্নিত রেজিস্ট্রেশন ঘরগুলো ঠিক করুন।'
  },
  failed: {
    en: 'Registration failed. Please try again.',
    bn: 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'
  }
};

const getPasswordStrength = (password) => {
  if (!password) {
    return { key: 'too-short', score: 0 };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { key: 'weak', score };
  if (score <= 3) return { key: 'moderate', score };

  return { key: 'strong', score };
};

function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    department: '',
    languagePreference: 'en'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

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

    const nextErrors = validateRegisterForm(form);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError(t('fixFields'));
      return;
    }

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
      setError(apiError?.response?.data?.message || t('failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>{t('title')}</h1>
        <p>{t('lead')}</p>
        <p className="meta">{t('defaultRole')}</p>

        <label htmlFor="fullName">{t('fullName')}</label>
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
        {formErrors.fullName && <p className="error-text">{formErrors.fullName}</p>}

        <label htmlFor="email">{t('email')}</label>
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          value={form.email}
          onChange={onChange}
          required
        />
        {formErrors.email && <p className="error-text">{formErrors.email}</p>}

        <label htmlFor="password">{t('password')}</label>
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
        {formErrors.password && <p className="error-text">{formErrors.password}</p>}

        <div className="password-strength" aria-live="polite">
          <div className="password-strength__bar">
            <span
              className={`password-strength__fill password-strength__fill--${passwordStrength.key}`}
              style={{ width: `${Math.max(passwordStrength.score, 1) * 20}%` }}
            />
          </div>
          <p className="meta">
            {t('strength')} {toLocalizedText(STRENGTH_LABELS[passwordStrength.key], language)}
          </p>
        </div>

        <label htmlFor="department">{t('department')}</label>
        <input
          id="department"
          type="text"
          name="department"
          value={form.department}
          onChange={onChange}
          maxLength={120}
        />
        {formErrors.department && <p className="error-text">{formErrors.department}</p>}

        <label htmlFor="languagePreference">{t('language')}</label>
        <select
          id="languagePreference"
          name="languagePreference"
          value={form.languagePreference}
          onChange={onChange}
        >
          <option value="en">{t('english')}</option>
          <option value="bn">{t('bangla')}</option>
        </select>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('creating') : t('title')}
        </button>

        <p>
          {t('haveAccount')} <Link to="/login/student">{t('signIn')}</Link>
        </p>

        <p>
          {t('staffAccount')} <Link to="/portals">{t('openGuide')}</Link>
        </p>
      </form>
    </section>
  );
}

export default RegisterPage;
