import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import { toLocalizedText } from '../../utils/localized';
import { getDefaultWorkspaceForUser } from '../../constants/roles';
import { getApiErrorMessage } from '../../utils/http';

const STRENGTH_LABELS = {
  'too-short': { en: 'Too short', bn: 'খুব ছোট' },
  weak: { en: 'Weak', bn: 'দুর্বল' },
  moderate: { en: 'Moderate', bn: 'মাঝারি' },
  strong: { en: 'Strong', bn: 'শক্তিশালী' }
};

const T = {
  back: { en: '← Back to sign in', bn: '← সাইন ইনে ফিরুন' },
  title: { en: 'Accept Invitation', bn: 'আমন্ত্রণ গ্রহণ করুন' },
  lead: {
    en: 'Set up your account to join the Digital Department Hub.',
    bn: 'ডিজিটাল ডিপার্টমেন্ট হাবে যুক্ত হতে আপনার অ্যাকাউন্ট সেট আপ করুন।'
  },
  fullName: { en: 'Full Name', bn: 'পুরো নাম' },
  password: { en: 'Password', bn: 'পাসওয়ার্ড' },
  confirmPassword: { en: 'Confirm password', bn: 'পাসওয়ার্ড নিশ্চিত করুন' },
  strength: { en: 'Password strength:', bn: 'পাসওয়ার্ডের শক্তি:' },
  creating: { en: 'Creating account…', bn: 'অ্যাকাউন্ট তৈরি হচ্ছে…' },
  submit: { en: 'Create account', bn: 'অ্যাকাউন্ট তৈরি করুন' },
  missingToken: {
    en: 'This invitation link is missing its token. Please use the link from your email.',
    bn: 'এই আমন্ত্রণ লিঙ্কে টোকেন নেই। অনুগ্রহ করে ইমেইলের লিঙ্ক ব্যবহার করুন।'
  },
  errName: {
    en: 'Please enter your full name (at least 2 characters).',
    bn: 'আপনার পুরো নাম লিখুন (কমপক্ষে ২ অক্ষর)।'
  },
  errMinLength: {
    en: 'Password must be at least 8 characters.',
    bn: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'
  },
  errMismatch: {
    en: 'The two passwords do not match.',
    bn: 'দুটি পাসওয়ার্ড মেলেনি।'
  },
  errInvalid: {
    en: 'This invitation is invalid or has expired. Ask an administrator to send a new one.',
    bn: 'এই আমন্ত্রণটি অকার্যকর বা মেয়াদোত্তীর্ণ। নতুন আমন্ত্রণের জন্য প্রশাসকের সাথে যোগাযোগ করুন।'
  },
  checking: { en: 'Checking your invitation…', bn: 'আপনার আমন্ত্রণ যাচাই করা হচ্ছে…' },
  goToSignIn: { en: 'Go to sign in', bn: 'সাইন ইনে যান' },
  emailLabel: { en: 'Account email', bn: 'অ্যাকাউন্ট ইমেইল' },
  stateAcceptedTitle: { en: 'This invitation was already used', bn: 'এই আমন্ত্রণটি ইতিমধ্যে ব্যবহৃত হয়েছে' },
  stateAccepted: {
    en: 'An account has already been created from this link. Please sign in with the password you set. If you forgot it, use "Forgot password".',
    bn: 'এই লিঙ্ক থেকে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি হয়েছে। আপনার সেট করা পাসওয়ার্ড দিয়ে সাইন ইন করুন। ভুলে গেলে "পাসওয়ার্ড ভুলে গেছেন" ব্যবহার করুন।'
  },
  stateRevokedTitle: { en: 'This invitation was revoked', bn: 'এই আমন্ত্রণটি বাতিল করা হয়েছে' },
  stateRevoked: {
    en: 'An administrator revoked this invitation. Please ask them to send a new one.',
    bn: 'একজন প্রশাসক এই আমন্ত্রণটি বাতিল করেছেন। অনুগ্রহ করে নতুন একটি পাঠাতে বলুন।'
  },
  stateExpiredTitle: { en: 'This invitation has expired', bn: 'এই আমন্ত্রণের মেয়াদ শেষ' },
  stateExpired: {
    en: 'Invitation links are valid for 72 hours. Please ask an administrator to send a new one.',
    bn: 'আমন্ত্রণ লিঙ্ক ৭২ ঘণ্টা বৈধ থাকে। অনুগ্রহ করে প্রশাসককে নতুন একটি পাঠাতে বলুন।'
  },
  stateInvalidTitle: { en: 'This invitation link is not valid', bn: 'এই আমন্ত্রণ লিঙ্কটি বৈধ নয়' },
  stateInvalid: {
    en: 'We could not find an invitation for this link. Please use the most recent link from your email.',
    bn: 'এই লিঙ্কের জন্য কোনো আমন্ত্রণ পাওয়া যায়নি। অনুগ্রহ করে আপনার ইমেইলের সর্বশেষ লিঙ্কটি ব্যবহার করুন।'
  }
};

const DEAD_STATES = {
  accepted: { titleKey: 'stateAcceptedTitle', bodyKey: 'stateAccepted' },
  revoked: { titleKey: 'stateRevokedTitle', bodyKey: 'stateRevoked' },
  expired: { titleKey: 'stateExpiredTitle', bodyKey: 'stateExpired' },
  invalid: { titleKey: 'stateInvalidTitle', bodyKey: 'stateInvalid' }
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

function AcceptInvitePage() {
  const navigate = useNavigate();
  const { acceptInvite } = useAuth();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ fullName: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Invitation state resolved on load: 'checking' | 'pending' | one of DEAD_STATES.
  const [inviteState, setInviteState] = useState(token ? 'checking' : 'invalid');
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setInviteState('invalid');
      return undefined;
    }

    setInviteState('checking');
    authApi
      .lookupInvitation(token)
      .then(({ data }) => {
        if (cancelled) return;
        const invitation = data?.invitation || {};
        setInviteEmail(invitation.email || '');
        setInviteState(invitation.state || 'invalid');
        if (invitation.state === 'pending' && invitation.fullName) {
          setForm((prev) => ({ ...prev, fullName: prev.fullName || invitation.fullName }));
        }
      })
      .catch(() => {
        if (!cancelled) setInviteState('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError(t('missingToken'));
      return;
    }
    if (form.fullName.trim().length < 2) {
      setError(t('errName'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('errMinLength'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('errMismatch'));
      return;
    }

    setLoading(true);

    try {
      const user = await acceptInvite({
        token,
        fullName: form.fullName.trim(),
        password: form.password
      });
      navigate(getDefaultWorkspaceForUser(user), { replace: true });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('errInvalid')));
    } finally {
      setLoading(false);
    }
  };

  if (inviteState === 'checking') {
    return (
      <section className="auth-screen">
        <div className="auth-card">
          <div className="auth-card__topbar">
            <Link to="/login" className="auth-card__back-link">
              {t('back')}
            </Link>
          </div>
          <h1>{t('title')}</h1>
          <p aria-live="polite">{t('checking')}</p>
        </div>
      </section>
    );
  }

  if (inviteState !== 'pending') {
    const state = DEAD_STATES[inviteState] || DEAD_STATES.invalid;
    return (
      <section className="auth-screen">
        <div className="auth-card">
          <div className="auth-card__topbar">
            <Link to="/login" className="auth-card__back-link">
              {t('back')}
            </Link>
          </div>
          <h1>{t(state.titleKey)}</h1>
          {inviteEmail ? (
            <p className="meta">
              {t('emailLabel')}: <strong>{inviteEmail}</strong>
            </p>
          ) : null}
          <p>{t(state.bodyKey)}</p>
          <Link to="/login" className="btn btn-primary">
            {t('goToSignIn')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-card__topbar">
          <Link to="/login" className="auth-card__back-link">
            {t('back')}
          </Link>
        </div>

        <h1>{t('title')}</h1>
        <p>{t('lead')}</p>

        {inviteEmail ? (
          <p className="meta">
            {t('emailLabel')}: <strong>{inviteEmail}</strong>
          </p>
        ) : null}

        {!token && <p className="error-text">{t('missingToken')}</p>}

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

        <label htmlFor="confirmPassword">{t('confirmPassword')}</label>
        <input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={onChange}
          minLength={8}
          required
        />

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading || !token}>
          {loading ? t('creating') : t('submit')}
        </button>
      </form>
    </section>
  );
}

export default AcceptInvitePage;
