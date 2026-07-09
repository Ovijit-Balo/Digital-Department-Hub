import { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import RichTextPreview from '../../components/ui/RichTextPreview';
import useLanguage from '../../hooks/useLanguage';
import usePageMeta from '../../hooks/usePageMeta';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalizedText, toIsoDate } from '../../utils/localized';

function NewsDetailPage() {
  const { newsId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [item, setItem] = useState(null);

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let res;
      // Try slug first, if it looks like a slug (contains letters/hyphens)
      if (newsId && /^[a-z0-9-]+$/.test(newsId)) {
        try {
          res = await cmsApi.getNewsBySlug(newsId);
          setItem(res.data.post || null);
          return;
        } catch (slugError) {
          // If slug lookup fails, try ID lookup
        }
      }
      // Fallback to ID lookup
      res = await cmsApi.getNewsById(newsId);
      setItem(res.data.post || null);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load news item.'));
    } finally {
      setLoading(false);
    }
  }, [newsId]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const title = useMemo(() => (item ? toLocalizedText(item.title, language) : ''), [item, language]);
  const summary = useMemo(
    () => (item ? toLocalizedText(item.summary, language) : ''),
    [item, language]
  );

  usePageMeta({ title: title || undefined, description: summary || undefined });

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
            Back
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
          Back to News
        </Link>
      </div>

      <p className="meta">Published {toIsoDate(item.publishedAt || item.createdAt)}</p>
      {summary ? <p className="news-detail-summary">{summary}</p> : null}
      <article className="surface-card">
        <div className="newsroom-detail-panel__body">
          <RichTextPreview html={toLocalizedText(item.body, language)} />
        </div>
      </article>
    </section>
  );
}

export default NewsDetailPage;
