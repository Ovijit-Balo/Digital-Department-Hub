import { useCallback, useEffect, useState } from 'react';
import { cmsApi } from '../../api/modules';
import InlineAlert from '../../components/ui/InlineAlert';
import SkeletonList from '../../components/ui/SkeletonList';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

const T = {
  loadFailed: { en: 'Failed to load announcements.', bn: 'ঘোষণা লোড করতে ব্যর্থ।' },
  eyebrow: { en: 'Department Updates', bn: 'বিভাগীয় হালনাগাদ' },
  title: { en: 'Announcements', bn: 'ঘোষণা' },
  subtitle: {
    en: 'Official announcements and notices from the department',
    bn: 'বিভাগ থেকে অফিসিয়াল ঘোষণা ও নোটিশ'
  },
  refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
  emptyTitle: { en: 'No announcements published yet.', bn: 'এখনও কোনো ঘোষণা প্রকাশিত হয়নি।' },
  emptyText: { en: 'Check back later for official updates.', bn: 'অফিসিয়াল হালনাগাদের জন্য পরে আবার দেখুন।' },
  badge: { en: 'Announcement', bn: 'ঘোষণা' }
};

function AnnouncementsPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
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
      setError(getApiErrorMessage(apiError, t('loadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  return (
    <section className="page-wrap">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="page-title-subtitle">{t('subtitle')}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadAnnouncements}>
          {t('refresh')}
        </button>
      </header>

      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {loading && <SkeletonList count={3} showMedia lines={2} />}
      {!loading && !items.length && (
        <div className="empty-state empty-state--center">
          <div className="empty-state__icon" aria-hidden="true">📢</div>
          <p className="empty-state__title">{t('emptyTitle')}</p>
          <p className="empty-state__text">{t('emptyText')}</p>
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
                {t('badge')}
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
