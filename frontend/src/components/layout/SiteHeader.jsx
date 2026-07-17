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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navRef = useRef(null);
  const actionsRef = useRef(null);
  const searchInputRef = useRef(null);
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
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const workspaceLabel = primaryPortal
    ? toLocalizedText(
        { en: `${primaryPortal.label} Workspace`, bn: `${primaryPortal.label} ওয়ার্কস্পেস` },
        language
      )
    : '';

  const userInitials = useMemo(() => {
    if (!user?.fullName) return 'U';
    const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'U';
  }, [user]);

  const handleSignOut = () => {
    const redirectPath = primaryPortal?.loginPath || '/portals';
    setUserMenuOpen(false);
    logout();
    navigate(redirectPath, { replace: true });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setSearchTerm('');
    setSearchOpen(false);
    setMobileNavOpen(false);
  };

  const handleSearchBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget) && !searchTerm.trim()) {
      setSearchOpen(false);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const handleUserMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      setUserMenuOpen(false);
    }
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
        aria-label={toLocalizedText({ en: 'Primary', bn: 'প্রধান' }, language)}
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

      <div className="auth-actions" ref={actionsRef}>
        <div className="nav-utilities">
          <form
            className={`nav-search${searchOpen ? ' nav-search--open' : ''}`}
            role="search"
            onSubmit={handleSearchSubmit}
            onBlur={handleSearchBlur}
            onKeyDown={handleSearchKeyDown}
          >
            <input
              type="search"
              ref={searchInputRef}
              className="nav-search__input"
              placeholder={toLocalizedText({ en: 'Search…', bn: 'অনুসন্ধান…' }, language)}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label={toLocalizedText({ en: 'Search the hub', bn: 'অনুসন্ধান' }, language)}
              aria-hidden={!searchOpen}
              tabIndex={searchOpen ? 0 : -1}
            />
            <button
              type={searchOpen ? 'submit' : 'button'}
              className="nav-search__btn"
              aria-label={
                searchOpen
                  ? toLocalizedText({ en: 'Submit search', bn: 'অনুসন্ধান করুন' }, language)
                  : toLocalizedText({ en: 'Open search', bn: 'অনুসন্ধান খুলুন' }, language)
              }
              aria-expanded={searchOpen}
              onClick={searchOpen ? undefined : () => setSearchOpen(true)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20.5 20.5-4-4" />
              </svg>
            </button>
          </form>
          <button
            type="button"
            className="theme-toggle theme-toggle--icon"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <label className="lang-switch lang-switch--compact" htmlFor="ui-language">
            <span className="sr-only">
              {toLocalizedText({ en: 'Language', bn: 'ভাষা' }, language)}
            </span>
            <select
              id="ui-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">EN</option>
              <option value="bn">বাং</option>
            </select>
          </label>
        </div>

        {user ? (
          <div className={`user-menu${userMenuOpen ? ' user-menu--open' : ''}`}>
            <button
              type="button"
              className="user-menu__trigger"
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((open) => !open)}
              onKeyDown={handleUserMenuKeyDown}
            >
              <span className="user-menu__avatar" aria-hidden="true">
                {userInitials}
              </span>
              <span className="user-menu__name">{user.fullName}</span>
              <span className="user-menu__caret" aria-hidden="true" />
            </button>
            {userMenuOpen && (
              <div
                className="user-menu__panel"
                role="menu"
                tabIndex={-1}
                onKeyDown={handleUserMenuKeyDown}
              >
                <div className="user-menu__meta">
                  <strong>{user.fullName}</strong>
                  {primaryPortal && <span>{primaryPortal.label}</span>}
                </div>
                {primaryPortal && (
                  <Link
                    to={primaryPortal.workspacePath}
                    className="user-menu__item"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    {workspaceLabel}
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="user-menu__item"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  {toLocalizedText({ en: 'My Profile', bn: 'আমার প্রোফাইল' }, language)}
                </Link>
                <hr className="user-menu__divider" />
                <button
                  type="button"
                  className="user-menu__item user-menu__item--danger"
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  {toLocalizedText({ en: 'Sign Out', bn: 'সাইন আউট' }, language)}
                </button>
              </div>
            )}
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
