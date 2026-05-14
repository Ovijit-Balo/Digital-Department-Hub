import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import { useThemeContext } from '../../context/ThemeContext';
import { getPrimaryPortalForUser } from '../../constants/roles';
import { PUBLIC_NAV_CONTENT, PUBLIC_NAV_SERVICES } from '../../constants/publicNav';
import { ui } from '../../i18n/publicUi';
import { toLocalizedText } from '../../utils/localized';

function matchesNavPrefix(pathname, prefixes) {
  return prefixes.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

const CONTENT_PREFIXES = PUBLIC_NAV_CONTENT.map((item) => item.to);
const SERVICE_PREFIXES = PUBLIC_NAV_SERVICES.map((item) => item.to);

function closeDetailsFromEvent(event) {
  const host = event.currentTarget.closest('details');
  if (host) {
    host.open = false;
  }
}

function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { isDark, toggleTheme } = useThemeContext();
  const primaryPortal = getPrimaryPortalForUser(user);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const pathname = location.pathname;

  const contentGroupActive = useMemo(
    () => matchesNavPrefix(pathname, CONTENT_PREFIXES),
    [pathname]
  );
  const servicesGroupActive = useMemo(
    () => matchesNavPrefix(pathname, SERVICE_PREFIXES),
    [pathname]
  );

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const workspaceLabel = primaryPortal
    ? toLocalizedText(
        { en: `${primaryPortal.label} Workspace`, bn: `${primaryPortal.label} ওয়ার্কস্পেস` },
        language
      )
    : '';

  const handleSignOut = () => {
    const redirectPath = primaryPortal?.loginPath || '/portals';
    logout();
    navigate(redirectPath, { replace: true });
  };

  const closeMobile = () => setMobileNavOpen(false);

  const navLinkClass = ({ isActive }) =>
    `nav-link${isActive ? ' nav-link--active' : ''}`;

  const renderLink = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={navLinkClass}
      onClick={(event) => {
        closeDetailsFromEvent(event);
        closeMobile();
      }}
    >
      {toLocalizedText(item.label, language)}
    </NavLink>
  );

  return (
    <div className="app-shell">
      <header className={`top-nav top-nav--public${mobileNavOpen ? ' is-mobile-nav-open' : ''}`}>
        <div className="brand-wrap">
          <Link to="/" className="brand-link" onClick={closeMobile}>
            {ui('brand', 'title', language)}
          </Link>
          <span className="brand-subtitle">
            {toLocalizedText(
              {
                en: 'Department-wide digital operations platform',
                bn: 'বিভাগজুড়ে ডিজিটাল অপারেশন প্ল্যাটফর্ম'
              },
              language
            )}
          </span>
        </div>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={mobileNavOpen}
          aria-controls="public-primary-nav"
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          {toLocalizedText({ en: 'Menu', bn: 'মেনু' }, language)}
        </button>

        <nav id="public-primary-nav" className="public-nav" aria-label="Primary">
          <div className="public-nav-inner">
            <NavLink to="/" end className={navLinkClass} onClick={closeMobile}>
              {ui('nav', 'home', language)}
            </NavLink>

            <details
              className={`nav-dropdown${contentGroupActive ? ' nav-dropdown--active' : ''}`}
            >
              <summary className="nav-dropdown__summary">
                {ui('nav', 'contentMedia', language)}
              </summary>
              <div className="nav-dropdown__panel" role="group">
                {PUBLIC_NAV_CONTENT.map((item) => renderLink(item))}
              </div>
            </details>

            <details
              className={`nav-dropdown${servicesGroupActive ? ' nav-dropdown--active' : ''}`}
            >
              <summary className="nav-dropdown__summary">
                {ui('nav', 'campusServices', language)}
              </summary>
              <div className="nav-dropdown__panel" role="group">
                {PUBLIC_NAV_SERVICES.map((item) => renderLink(item))}
              </div>
            </details>

            <NavLink to="/contact" className={navLinkClass} onClick={closeMobile}>
              {ui('nav', 'contact', language)}
            </NavLink>
            <NavLink to="/portals" className={navLinkClass} onClick={closeMobile}>
              {ui('nav', 'portals', language)}
            </NavLink>
            {primaryPortal && (
              <NavLink
                to={primaryPortal.workspacePath}
                className={({ isActive }) => `nav-link nav-admin-link${isActive ? ' nav-link--active' : ''}`}
                onClick={closeMobile}
              >
                {workspaceLabel}
              </NavLink>
            )}
          </div>
        </nav>

        <div className="auth-actions">
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <label className="lang-switch" htmlFor="ui-language">
            <span>{toLocalizedText({ en: 'Language', bn: 'ভাষা' }, language)}</span>
            <select
              id="ui-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">EN</option>
              <option value="bn">BN</option>
            </select>
          </label>

          {user ? (
            <>
              <span className="user-chip">
                {user.fullName}
                {primaryPortal ? ` • ${primaryPortal.label}` : ''}
              </span>
              <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
                {toLocalizedText({ en: 'Sign Out', bn: 'সাইন আউট' }, language)}
              </button>
            </>
          ) : (
            <div className="guest-auth-actions">
              <Link to="/register" className="btn btn-ghost">
                {toLocalizedText({ en: 'Register', bn: 'রেজিস্টার' }, language)}
              </Link>
              <Link to="/portals" className="btn btn-primary">
                {toLocalizedText({ en: 'Sign In', bn: 'সাইন ইন' }, language)}
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="public-content">
        <Outlet />
      </main>

      <footer className="footer footer--sitemap">
        <div className="footer-grid">
          <div className="footer-col">
            <p className="footer-col-title">{ui('nav', 'contentMedia', language)}</p>
            <ul className="footer-links">
              {PUBLIC_NAV_CONTENT.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{toLocalizedText(item.label, language)}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <p className="footer-col-title">{ui('nav', 'campusServices', language)}</p>
            <ul className="footer-links">
              {PUBLIC_NAV_SERVICES.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{toLocalizedText(item.label, language)}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <p className="footer-col-title">{ui('nav', 'connect', language)}</p>
            <ul className="footer-links">
              <li>
                <Link to="/contact">{ui('nav', 'contact', language)}</Link>
              </li>
              <li>
                <Link to="/portals">{ui('nav', 'portals', language)}</Link>
              </li>
              <li>
                <Link to="/">{ui('nav', 'home', language)}</Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="footer-tagline">
          {toLocalizedText(
            {
              en: 'Digital Department Hub • Built for operational transparency and student service excellence',
              bn: 'ডিজিটাল ডিপার্টমেন্ট হাব • স্বচ্ছ অপারেশন এবং উন্নত শিক্ষার্থী সেবার জন্য নির্মিত'
            },
            language
          )}
        </p>
      </footer>
    </div>
  );
}

export default PublicLayout;
