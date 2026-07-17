import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import { toLocalizedText } from '../../utils/localized';
import { getApiErrorMessage } from '../../utils/http';

const T = {
  back: { en: '← Back to sign in', bn: '← সাইন ইনে ফিরুন' },
  title: { en: 'Reset Password', bn: 'পাসওয়ার্ড রিসেট করুন' },
  successMsg: {
    en: 'Your password has been reset. You can now sign in with your new password.',
    bn: 'আপনার পাসওয়ার্ড রিসেট হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে সাইন ইন করতে পারবেন।'
  },
  goToSignIn: { en: 'Go to sign in', bn: 'সাইন ইনে যান' },
  chooseNew: { en: 'Choose a new password for your account.', bn: 'আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড বেছে নিন।' },
  missingToken: {
    en: 'This reset link is missing its token. Please use the link from your email or request a new one.',
    bn: 'এই রিসেট লিঙ্কে টোকেন নেই। অনুগ্রহ করে ইমেইলের লিঙ্ক ব্যবহার করুন অথবা নতুন লিঙ্ক নিন।'
  },
  newPassword: { en: 'New password', bn: 'নতুন পাসওয়ার্ড' },
  confirmPassword: { en: 'Confirm new password', bn: 'নতুন পাসওয়ার্ড নিশ্চিত করুন' },
  resetting: { en: 'Resetting…', bn: 'রিসেট হচ্ছে…' },
  resetBtn: { en: 'Reset password', bn: 'পাসওয়ার্ড রিসেট করুন' },
  needNew: { en: 'Need a new link?', bn: 'নতুন লিঙ্ক প্রয়োজন?' },
  requestAnother: { en: 'Request another', bn: 'আরেকটি নিন' },
  errMissingToken: {
    en: 'This reset link is missing its token. Request a new link.',
    bn: 'এই রিসেট লিঙ্কে টোকেন নেই। নতুন লিঙ্ক নিন।'
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
    en: 'This reset link is invalid or has expired. Request a new one.',
    bn: 'এই রিসেট লিঙ্কটি অকার্যকর বা মেয়াদোত্তীর্ণ। নতুন লিঙ্ক নিন।'
  }
};

function ResetPasswordPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError(t('errMissingToken'));
      return;
    }
    if (form.newPassword.length < 8) {
      setError(t('errMinLength'));
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError(t('errMismatch'));
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword({ token, newPassword: form.newPassword });
      setDone(true);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('errInvalid')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-card__topbar">
          <Link to="/login" className="auth-card__back-link">
            {t('back')}
          </Link>
        </div>

        <h1>{t('title')}</h1>

        {done ? (
          <>
            <p className="meta" role="status">
              {t('successMsg')}
            </p>
            <Link to="/login" className="btn btn-primary">
              {t('goToSignIn')}
            </Link>
          </>
        ) : (
          <>
            <p>{t('chooseNew')}</p>

            {!token && <p className="error-text">{t('missingToken')}</p>}

            <label htmlFor="newPassword">{t('newPassword')}</label>
            <input
              id="newPassword"
              type="password"
              name="newPassword"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={onChange}
              minLength={8}
              required
            />

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

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('resetting') : t('resetBtn')}
            </button>

            <p>
              {t('needNew')} <Link to="/forgot-password">{t('requestAnother')}</Link>
            </p>
          </>
        )}
      </form>
    </section>
  );
}

export default ResetPasswordPage;
