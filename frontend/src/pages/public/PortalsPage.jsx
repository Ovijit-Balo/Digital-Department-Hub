import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import { toLocalizedText } from '../../utils/localized';
import {
  PORTAL_DEFINITIONS,
  PORTAL_KEYS,
  getDefaultWorkspaceForUser,
  getPrimaryPortalForUser
} from '../../constants/roles';

const T = {
  title: { en: 'Portal Sign-In Guide', bn: 'পোর্টাল সাইন-ইন গাইড' },
  lead: {
    en: 'Choose the correct login page for your assigned role so you land in the right workspace immediately after sign-in.',
    bn: 'আপনার নির্ধারিত ভূমিকার জন্য সঠিক লগইন পাতা বেছে নিন, যাতে সাইন ইনের পরপরই সঠিক ওয়ার্কস্পেসে পৌঁছান।'
  },
  portalSuffix: { en: 'Portal', bn: 'পোর্টাল' },
  workspace: { en: 'Workspace:', bn: 'ওয়ার্কস্পেস:' },
  signInAs: { en: 'Sign In as', bn: 'সাইন ইন করুন' },
  currentSession: { en: 'Current Session', bn: 'বর্তমান সেশন' },
  signedInAs: { en: 'Signed in as', bn: 'সাইন ইন করা হয়েছে' },
  userFallback: { en: 'User', bn: 'ব্যবহারকারী' },
  goWorkspace: { en: 'Go to My Workspace', bn: 'আমার ওয়ার্কস্পেসে যান' },
  openLogin: { en: 'Open My Login Page', bn: 'আমার লগইন পাতা খুলুন' }
};

function PortalsPage() {
  const { isAuthenticated, user } = useAuth();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);

  const primaryPortal = getPrimaryPortalForUser(user);
  const workspacePath = getDefaultWorkspaceForUser(user);

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>{t('title')}</h1>
      </div>

      <p className="meta">{t('lead')}</p>

      <div className="portal-grid">
        {PORTAL_KEYS.map((portalKey) => {
          const portal = PORTAL_DEFINITIONS[portalKey];

          return (
            <article key={portal.key} className="surface-card portal-card">
              <h3>
                {portal.label} {t('portalSuffix')}
              </h3>
              <p>{portal.description}</p>
              <p className="meta">
                {t('workspace')} {portal.workspaceLabel}
              </p>
              <Link to={portal.loginPath} className="btn btn-primary">
                {t('signInAs')} {portal.label}
              </Link>
            </article>
          );
        })}
      </div>

      {isAuthenticated && (
        <article className="surface-card portal-current-session">
          <h3>{t('currentSession')}</h3>
          <p>
            {t('signedInAs')} <strong>{user?.fullName || t('userFallback')}</strong>
            {primaryPortal ? ` (${primaryPortal.label})` : ''}.
          </p>
          <div className="action-row">
            <Link to={workspacePath} className="btn btn-ghost">
              {t('goWorkspace')}
            </Link>
            {primaryPortal && (
              <Link to={primaryPortal.loginPath} className="btn btn-ghost">
                {t('openLogin')}
              </Link>
            )}
          </div>
        </article>
      )}
    </section>
  );
}

export default PortalsPage;
