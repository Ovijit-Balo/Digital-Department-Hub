import { useCallback, useEffect, useState } from 'react';
import { cmsApi } from '../../api/modules';
import InlineAlert from '../../components/common/InlineAlert';
import SkeletonList from '../../components/common/SkeletonList';
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
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">Department Updates</p>
          <h1>Announcements</h1>
          <p className="page-title-subtitle">Official announcements and notices from the department</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadAnnouncements}>
          Refresh
        </button>
      </header>

      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {loading && <SkeletonList count={3} showMedia lines={2} />}
      {!loading && !items.length && (
        <div className="empty-state empty-state--center">
          <div className="empty-state__icon" aria-hidden="true">📢</div>
          <p className="empty-state__title">No announcements published yet.</p>
          <p className="empty-state__text">Check back later for official updates.</p>
        </div>
      )}

      <div className="content-list content-list--grid">
        {items.map((item) => (
          <article key={item._id} className="surface-card content-card">
            <div className="content-card__header">
              <h3 className="content-card__title">
                {toLocalizedText(item.title, language)}
              </h3>
              <span className="content-card__badge content-card__badge--announcement">
                Announcement
              </span>
            </div>
            <p className="content-card__excerpt">
              {toLocalizedText(item.summary, language)}
            </p>
            <div className="content-card__footer">
              <p className="content-card__meta">
                <span className="content-card__meta-item">
                  <span className="content-card__meta-icon" aria-hidden="true">📅</span>
                  {toIsoDate(item.publishedAt || item.createdAt)}
                </span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AnnouncementsPage;
