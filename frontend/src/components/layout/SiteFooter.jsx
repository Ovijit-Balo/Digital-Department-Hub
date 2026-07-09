import { Link } from 'react-router-dom';
import useLanguage from '../../hooks/useLanguage';
import {
  PUBLIC_NAV_ABOUT,
  PUBLIC_NAV_CONTENT,
  PUBLIC_NAV_SERVICES
} from '../../constants/publicNav';
import { ui } from '../../i18n/publicUi';
import { toLocalizedText } from '../../utils/localized';

function SiteFooter() {
  const { language } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="footer footer--sitemap">
      <div className="footer-identity">
        <p className="footer-wordmark">{ui('brand', 'department', language)}</p>
        <p className="footer-univ">{ui('brand', 'university', language)}</p>
        <p className="footer-address">{ui('footer', 'address', language)}</p>
        <Link to="/contact" className="footer-contact-cta">
          {ui('footer', 'contactCta', language)} →
        </Link>
      </div>

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
              <Link to={PUBLIC_NAV_ABOUT.to}>{ui('nav', 'about', language)}</Link>
            </li>
            <li>
              <Link to="/contact">{ui('nav', 'contact', language)}</Link>
            </li>
            <li>
              <Link to="/portals">{ui('nav', 'portals', language)}</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-legal">
        <p>
          © {year} {ui('brand', 'department', language)}, {ui('brand', 'university', language)}.{' '}
          {ui('footer', 'rights', language)}
        </p>
        <p className="footer-platform">{ui('footer', 'poweredBy', language)}</p>
      </div>
    </footer>
  );
}

export default SiteFooter;
