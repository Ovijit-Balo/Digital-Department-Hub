import { Link } from 'react-router-dom';
import useLanguage from '../hooks/useLanguage';
import { ui } from '../i18n/publicUi';

export function NotFoundPage() {
  const { language } = useLanguage();

  return (
    <section className="page-wrap">
      <div className="hero-content">
        <h1>{ui('errors', 'notFoundTitle', language)}</h1>
        <p>{ui('errors', 'notFoundMessage', language)}</p>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/" className="btn btn-primary">
            {ui('errors', 'goHome', language)}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default NotFoundPage;
