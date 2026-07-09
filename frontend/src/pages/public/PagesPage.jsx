import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import InlineAlert from '../../components/ui/InlineAlert';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalizedText } from '../../utils/localized';

function stripHtml(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function PagesPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await cmsApi.listPages({ status: 'published', limit: 100 });
      setItems(response.data.items || []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load pages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  return (
    <section className="page-wrap">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">Static Content</p>
          <h1>Department Pages</h1>
          <p className="page-title-subtitle">Static pages and informational content</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadPages}>
          Refresh
        </button>
      </header>

      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {loading && <p>Loading pages...</p>}
      {!loading && !items.length && (
        <div className="empty-state empty-state--center">
          <div className="empty-state__icon" aria-hidden="true">📄</div>
          <p className="empty-state__title">No pages published yet.</p>
          <p className="empty-state__text">Static content pages will appear here.</p>
        </div>
      )}

      <div className="content-list content-list--grid">
        {items.map((item) => (
          <article key={item._id} className="surface-card content-card">
            <div className="content-card__header">
              <h3 className="content-card__title">
                <Link to={`/pages/${item.slug}`} className="content-card__title-link">
                  {toLocalizedText(item.title, language)}
                </Link>
              </h3>
              <span className="content-card__badge content-card__badge--academic">
                Page
              </span>
            </div>
            <p className="content-card__excerpt">
              {stripHtml(toLocalizedText(item.content, language)).slice(0, 220)}...
            </p>
            <div className="content-card__footer">
              <Link to={`/pages/${item.slug}`} className="btn btn-ghost">
                Read Page
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PagesPage;
