import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import { toLocalizedText } from '../../utils/localized';
import { getApiErrorMessage } from '../../utils/http';

const T = {
  back: { en: '← Back to sign in', bn: '← সাইন ইনে ফিরুন' },
  title: { en: 'Forgot Password', bn: 'পাসওয়ার্ড ভুলে গেছেন' },
  lead: {
    en: "Enter the email associated with your account and we'll send a link to reset your password. The link expires in one hour.",
    bn: 'আপনার অ্যাকাউন্টের সাথে যুক্ত ইমেইল দিন, আমরা পাসওয়ার্ড রিসেট করার লিঙ্ক পাঠাব। লিঙ্কটি এক ঘণ্টা পর মেয়াদোত্তীর্ণ হবে।'
  },
  sent: {
    en: 'If an account exists for that email, a password reset link has been sent.',
    bn: 'ওই ইমেইলে অ্যাকাউন্ট থাকলে একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে।'
  },
  email: { en: 'Email', bn: 'ইমেইল' },
  sending: { en: 'Sending…', bn: 'পাঠানো হচ্ছে…' },
  sendLink: { en: 'Send reset link', bn: 'রিসেট লিঙ্ক পাঠান' },
  remembered: { en: 'Remembered it?', bn: 'মনে পড়েছে?' },
  return: { en: 'Return to sign in', bn: 'সাইন ইনে ফিরুন' },
  failed: {
    en: 'Could not process the reset request. Try again.',
    bn: 'রিসেট অনুরোধ প্রক্রিয়া করা যায়নি। আবার চেষ্টা করুন।'
  }
};

function ForgotPasswordPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await authApi.forgotPassword(email.trim());
      // The API intentionally returns the same message whether or not the
      // account exists, so we simply surface it.
      setMessage(response?.data?.message || t('sent'));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('failed')));
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
        <p>{t('lead')}</p>

        {message ? (
          <p className="meta" role="status">
            {message}
          </p>
        ) : (
          <>
            <label htmlFor="email">{t('email')}</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('sending') : t('sendLink')}
            </button>
          </>
        )}

        <p>
          {t('remembered')} <Link to="/login">{t('return')}</Link>
        </p>
      </form>
    </section>
  );
}

export default ForgotPasswordPage;
