import { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import RichTextPreview from '../../components/ui/RichTextPreview';
import useLanguage from '../../hooks/useLanguage';
import usePageMeta from '../../hooks/usePageMeta';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { resolveSeoMeta } from '../../utils/seo';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { toLocalizedText, toIsoDate } from '../../utils/localized';

const T = {
  loadFailed: { en: 'Failed to load news item.', bn: 'সংবাদ আইটেম লোড করতে ব্যর্থ।' },
  back: { en: 'Back', bn: 'ফিরে যান' },
  backToNews: { en: 'Back to News', bn: 'সংবাদে ফিরুন' },
  published: { en: 'Published', bn: 'প্রকাশিত' }
};

// A MongoDB ObjectId is 24 hex chars. A slug also matches [a-z0-9-]+, so we must
// check for the ObjectId shape first — otherwise an id is sent to the slug
// endpoint and 404s before the id fallback ever runs.
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function NewsDetailPage() {
  const { newsId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [item, setItem] = useState(null);

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Route by shape: a 24-char hex value is an ObjectId, anything else is a slug.
      const res = OBJECT_ID_PATTERN.test(newsId)
        ? await cmsApi.getNewsById(newsId)
        : await cmsApi.getNewsBySlug(newsId);
      setItem(res.data.post || null);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('loadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsId, language]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const title = useMemo(() => (item ? toLocalizedText(item.title, language) : ''), [item, language]);
  const summary = useMemo(
    () => (item ? toLocalizedText(item.summary, language) : ''),
    [item, language]
  );

  usePageMeta(resolveSeoMeta(item, { language, bodyField: 'body' }));

  if (loading) {
    return (
      <section className="page-wrap">
        <p>{ui('newsroom', 'loadingList', language)}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-wrap">
        <p className="error-text">{error}</p>
      </section>
    );
  }

  if (!item) {
    return (
      <section className="page-wrap">
        <p>{ui('newsroom', 'noNews', language) || 'News not found.'}</p>
        <p>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            {t('back')}
          </button>
        </p>
      </section>
    );
  }

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>{title}</h1>
        <Link to="/news" className="btn btn-ghost">
          {t('backToNews')}
        </Link>
      </div>

      <p className="meta">{t('published')} {toIsoDate(item.publishedAt || item.createdAt)}</p>
      {summary ? <p className="news-detail-summary">{summary}</p> : null}
      {item.coverImageUrl ? (
        <img src={resolveMediaUrl(item.coverImageUrl)} alt={title} className="content-detail__cover" />
      ) : null}
      <article className="surface-card">
        <div className="newsroom-detail-panel__body">
          <RichTextPreview html={toLocalizedText(item.body, language)} />
        </div>
      </article>
    </section>
  );
}

export default NewsDetailPage;
