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

const T = {
  loadFailed: { en: 'Failed to load pages.', bn: 'পৃষ্ঠা লোড করতে ব্যর্থ।' },
  eyebrow: { en: 'Static Content', bn: 'স্ট্যাটিক বিষয়বস্তু' },
  title: { en: 'Department Pages', bn: 'বিভাগীয় পৃষ্ঠা' },
  subtitle: { en: 'Static pages and informational content', bn: 'স্ট্যাটিক পৃষ্ঠা ও তথ্যমূলক বিষয়বস্তু' },
  refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
  loading: { en: 'Loading pages...', bn: 'পৃষ্ঠা লোড হচ্ছে...' },
  emptyTitle: { en: 'No pages published yet.', bn: 'এখনও কোনো পৃষ্ঠা প্রকাশিত হয়নি।' },
  emptyText: { en: 'Static content pages will appear here.', bn: 'স্ট্যাটিক বিষয়বস্তুর পৃষ্ঠা এখানে দেখা যাবে।' },
  badge: { en: 'Page', bn: 'পৃষ্ঠা' },
  readPage: { en: 'Read Page', bn: 'পৃষ্ঠা পড়ুন' }
};

function PagesPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
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
      setError(getApiErrorMessage(apiError, t('loadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  return (
    <section className="page-wrap">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="page-title-subtitle">{t('subtitle')}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadPages}>
          {t('refresh')}
        </button>
      </header>

      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {loading && <p>{t('loading')}</p>}
      {!loading && !items.length && (
        <div className="empty-state empty-state--center">
          <div className="empty-state__icon" aria-hidden="true">📄</div>
          <p className="empty-state__title">{t('emptyTitle')}</p>
          <p className="empty-state__text">{t('emptyText')}</p>
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
                {t('badge')}
              </span>
            </div>
            <p className="content-card__excerpt">
              {stripHtml(toLocalizedText(item.content, language)).slice(0, 220)}...
            </p>
            <div className="content-card__footer">
              <Link to={`/pages/${item.slug}`} className="btn btn-ghost">
                {t('readPage')}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PagesPage;
