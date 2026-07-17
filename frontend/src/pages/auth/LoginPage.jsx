import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import { toLocalizedText } from '../../utils/localized';
import { validateLoginForm } from '../../utils/formValidation';
import {
  PORTAL_DEFINITIONS,
  PORTAL_KEYS,
  getDefaultWorkspaceForUser,
  getPortalDefinition,
  getPrimaryPortalForUser,
  userCanAccessPortal
} from '../../constants/roles';

const T = {
  back: { en: '← Back to portal guide', bn: '← পোর্টাল গাইডে ফিরুন' },
  signIn: { en: 'Sign In', bn: 'সাইন ইন' },
  signInSuffix: { en: 'Sign In', bn: 'সাইন ইন' },
  genericLead: {
    en: 'Use your institutional account to access the Digital Department Hub.',
    bn: 'ডিজিটাল ডিপার্টমেন্ট হাব ব্যবহার করতে আপনার প্রাতিষ্ঠানিক অ্যাকাউন্ট ব্যবহার করুন।'
  },
  choosePortal: { en: 'Choose portal', bn: 'পোর্টাল নির্বাচন করুন' },
  email: { en: 'Email', bn: 'ইমেইল' },
  password: { en: 'Password', bn: 'পাসওয়ার্ড' },
  keepSignedIn: {
    en: 'Keep me signed in on this device',
    bn: 'এই ডিভাইসে আমাকে সাইন ইন রাখুন'
  },
  tempHint: {
    en: 'Prefer a temporary session? Uncheck the box above.',
    bn: 'অস্থায়ী সেশন চান? উপরের বক্সটি আনচেক করুন।'
  },
  forgot: { en: 'Forgot password?', bn: 'পাসওয়ার্ড ভুলে গেছেন?' },
  signingIn: { en: 'Signing In...', bn: 'সাইন ইন হচ্ছে...' },
  postLogin: { en: 'Post-login workspace:', bn: 'সাইন ইন পরবর্তী ওয়ার্কস্পেস:' },
  needStudent: { en: 'Need a student account?', bn: 'শিক্ষার্থী অ্যাকাউন্ট প্রয়োজন?' },
  createOne: { en: 'Create one', bn: 'তৈরি করুন' },
  provisioned: {
    en: 'Admin, Teacher, and Staff accounts are provisioned by system administrators.',
    bn: 'অ্যাডমিন, শিক্ষক ও স্টাফ অ্যাকাউন্ট সিস্টেম প্রশাসকগণ তৈরি করেন।'
  },
  needHelp: { en: 'Need help choosing?', bn: 'নির্বাচনে সাহায্য প্রয়োজন?' },
  openGuide: { en: 'Open Portal Guide', bn: 'পোর্টাল গাইড খুলুন' },
  fixFields: {
    en: 'Please fix the highlighted sign-in fields.',
    bn: 'অনুগ্রহ করে চিহ্নিত সাইন-ইন ঘরগুলো ঠিক করুন।'
  },
  noPortal: {
    en: 'This account has no eligible portal assignment. Contact an administrator.',
    bn: 'এই অ্যাকাউন্টের কোনো যোগ্য পোর্টাল বরাদ্দ নেই। প্রশাসকের সাথে যোগাযোগ করুন।'
  },
  loginFailed: {
    en: 'Login failed. Please verify your credentials.',
    bn: 'সাইন ইন ব্যর্থ হয়েছে। আপনার তথ্য যাচাই করুন।'
  }
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { portal } = useParams();
  const { login, logout } = useAuth();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);

  const [form, setForm] = useState({ email: '', password: '', rememberMe: true });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

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

    const nextErrors = validateLoginForm(form);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError(t('fixFields'));
      return;
    }

    setLoading(true);

    try {
      const user = await login(form, { rememberMe: form.rememberMe });

      if (selectedPortal && !userCanAccessPortal(user, selectedPortal.key)) {
        const assignedPortal = getPrimaryPortalForUser(user);

        logout();
        setError(
          assignedPortal
            ? toLocalizedText(
                {
                  en: `This account is assigned to the ${assignedPortal.label} portal. Use ${assignedPortal.loginPath} to continue.`,
                  bn: `এই অ্যাকাউন্টটি ${assignedPortal.label} পোর্টালে বরাদ্দ। চালিয়ে যেতে ${assignedPortal.loginPath} ব্যবহার করুন।`
                },
                language
              )
            : t('noPortal')
        );
        return;
      }

      navigate(location.state?.from || getDefaultWorkspaceForUser(user), { replace: true });
    } catch (apiError) {
      setError(apiError?.response?.data?.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-card__topbar">
          <Link to="/portals" className="auth-card__back-link">
            {t('back')}
          </Link>
        </div>

        <h1>{selectedPortal ? `${selectedPortal.label} ${t('signInSuffix')}` : t('signIn')}</h1>
        <p>{selectedPortal ? selectedPortal.description : t('genericLead')}</p>

        <div className="portal-switch-wrap">
          <p className="meta">{t('choosePortal')}</p>
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
          autoComplete="current-password"
          value={form.password}
          onChange={onChange}
          required
        />
        {formErrors.password && <p className="error-text">{formErrors.password}</p>}

        <label className="form-check">
          <input
            type="checkbox"
            name="rememberMe"
            checked={form.rememberMe}
            onChange={(event) => setForm((prev) => ({ ...prev, rememberMe: event.target.checked }))}
          />
          <span>{t('keepSignedIn')}</span>
        </label>

        <div className="auth-inline-actions">
          <span className="meta">{t('tempHint')}</span>
          <Link to="/forgot-password" className="home-inline-link">
            {t('forgot')}
          </Link>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('signingIn') : t('signIn')}
        </button>

        {selectedPortal && (
          <p className="meta">
            {t('postLogin')} {selectedPortal.workspaceLabel}
          </p>
        )}

        {selectedPortal?.key === 'student' || !selectedPortal ? (
          <p>
            {t('needStudent')} <Link to="/register">{t('createOne')}</Link>
          </p>
        ) : (
          <p className="meta">{t('provisioned')}</p>
        )}

        <p>
          {t('needHelp')} <Link to="/portals">{t('openGuide')}</Link>
        </p>
      </form>
    </section>
  );
}

export default LoginPage;
