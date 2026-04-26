import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalizedText } from '../../utils/localized';

function stripHtml(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
      <div className="section-head">
        <h1>Department Pages</h1>
        <button type="button" className="btn btn-ghost" onClick={loadPages}>
          Refresh
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading pages...</p>}
      {!loading && !items.length && <p>No pages published yet.</p>}

      <div className="stack-list">
        {items.map((item) => (
          <article key={item._id} className="surface-card">
            <h3>{toLocalizedText(item.title, language)}</h3>
            <p>{stripHtml(toLocalizedText(item.content, language)).slice(0, 220)}...</p>
            <Link to={`/pages/${item.slug}`} className="btn btn-ghost">
              Read Page
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PagesPage;
