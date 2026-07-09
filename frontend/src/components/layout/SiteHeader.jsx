import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import { useThemeContext } from '../../context/ThemeContext';
import { getPrimaryPortalForUser } from '../../constants/roles';
import {
  PUBLIC_NAV_ABOUT,
  PUBLIC_NAV_CONTENT,
  PUBLIC_NAV_SERVICES
} from '../../constants/publicNav';
import { ui } from '../../i18n/publicUi';
import { toLocalizedText } from '../../utils/localized';

function matchesNavPrefix(pathname, prefixes) {
  return prefixes.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

const CONTENT_PREFIXES = PUBLIC_NAV_CONTENT.map((item) => item.to);
const SERVICE_PREFIXES = PUBLIC_NAV_SERVICES.map((item) => item.to);

function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { isDark, toggleTheme } = useThemeContext();
  const primaryPortal = getPrimaryPortalForUser(user);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef(null);
  const dropdownButtonRefs = useRef({});

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const pathname = location.pathname;
  const isProfileRoute = pathname === '/profile';

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
    setOpenDropdown(null);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  const workspaceLabel = primaryPortal
    ? toLocalizedText(
        { en: `${primaryPortal.label} Workspace`, bn: `${primaryPortal.label} ওয়ার্কস্পেস` },
        language
      )
    : '';

  const handleSignOut = () => {
    const redirectPath = primaryPortal?.loginPath || '/portals';
    logout();
    navigate(redirectPath, { replace: true });
  };

  const closeMobile = () => setMobileNavOpen(false);
  const closeDropdowns = () => setOpenDropdown(null);

  const handleNavKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    if (openDropdown) {
      const button = dropdownButtonRefs.current[openDropdown];
      setOpenDropdown(null);
      button?.focus();
      return;
    }
    if (mobileNavOpen) {
      setMobileNavOpen(false);
    }
  };

  const handleNavBlur = (event) => {
    if (navRef.current && !navRef.current.contains(event.relatedTarget)) {
      setOpenDropdown(null);
    }
  };

  const navLinkClass = ({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`;

  const renderLink = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={navLinkClass}
      onClick={() => {
        closeDropdowns();
        closeMobile();
      }}
    >
      {toLocalizedText(item.label, language)}
    </NavLink>
  );

  const renderDropdown = (id, label, items, groupActive) => {
    const isOpen = openDropdown === id;
    return (
      <div
        className={`nav-dropdown${isOpen ? ' nav-dropdown--open' : ''}${
          groupActive ? ' nav-dropdown--active' : ''
        }`}
      >
        <button
          type="button"
          className="nav-dropdown__summary"
          aria-expanded={isOpen}
          aria-haspopup="true"
          ref={(node) => {
            dropdownButtonRefs.current[id] = node;
          }}
          onClick={() => setOpenDropdown((current) => (current === id ? null : id))}
        >
          {label}
        </button>
        <div className="nav-dropdown__panel">
          {items.map((item) => renderLink(item))}
        </div>
      </div>
    );
  };

  return (
    <header
      className={`top-nav top-nav--public${mobileNavOpen ? ' is-mobile-nav-open' : ''}${
        isScrolled ? ' top-nav--scrolled' : ''
      }${isProfileRoute ? ' top-nav--minimal' : ''}`}
    >
      <div className="brand-wrap">
        <Link to="/" className="brand-link brand-lockup" onClick={closeMobile}>
          <span className="brand-dept">{ui('brand', 'department', language)}</span>
          <span className="brand-univ">{ui('brand', 'university', language)}</span>
        </Link>
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

      <nav
        id="public-primary-nav"
        ref={navRef}
        className="public-nav"
        aria-label="Primary"
        onKeyDown={handleNavKeyDown}
        onBlur={handleNavBlur}
      >
        <div className="public-nav-inner">
          <NavLink to="/" end className={navLinkClass} onClick={closeMobile}>
            {ui('nav', 'home', language)}
          </NavLink>

          <NavLink to={PUBLIC_NAV_ABOUT.to} className={navLinkClass} onClick={closeMobile}>
            {ui('nav', 'about', language)}
          </NavLink>

          {renderDropdown(
            'content',
            ui('nav', 'contentMedia', language),
            PUBLIC_NAV_CONTENT,
            contentGroupActive
          )}

          {renderDropdown(
            'services',
            ui('nav', 'campusServices', language),
            PUBLIC_NAV_SERVICES,
            servicesGroupActive
          )}

          <NavLink to="/contact" className={navLinkClass} onClick={closeMobile}>
            {ui('nav', 'contact', language)}
          </NavLink>
        </div>
      </nav>

      <div className="auth-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
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
          <div className="account-actions">
            {primaryPortal && (
              <Link to={primaryPortal.workspacePath} className="btn btn-primary">
                {workspaceLabel}
              </Link>
            )}
            <Link to="/profile" className="user-chip">
              {user.fullName}
              {primaryPortal ? ` • ${primaryPortal.label}` : ''}
            </Link>
            <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
              {toLocalizedText({ en: 'Sign Out', bn: 'সাইন আউট' }, language)}
            </button>
          </div>
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
  );
}

export default SiteHeader;
