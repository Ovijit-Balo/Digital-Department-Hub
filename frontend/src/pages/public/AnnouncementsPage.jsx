import { useCallback, useEffect, useState } from 'react';
import { cmsApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

function AnnouncementsPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await cmsApi.listAnnouncements({ status: 'published', limit: 30 });
      setItems(response.data.items || []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load announcements.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>Announcements</h1>
        <button type="button" className="btn btn-ghost" onClick={loadAnnouncements}>
          Refresh
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading announcements...</p>}
      {!loading && !items.length && <p>No announcements published yet.</p>}

      <div className="stack-list">
        {items.map((item) => (
          <article key={item._id} className="surface-card">
            <h3>{toLocalizedText(item.title, language)}</h3>
            <p>{toLocalizedText(item.summary, language)}</p>
            <p className="meta">Published: {toIsoDate(item.publishedAt || item.createdAt)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AnnouncementsPage;
