import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
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

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const res = await cmsApi.listNews({ status: 'published', limit: 100 });
        const found = (res.data.items || []).find((n) => n._id === newsId || n.slug === newsId);
        if (mounted) setItem(found || null);
      } catch (apiError) {
        if (mounted) setError(getApiErrorMessage(apiError, 'Failed to load news item.'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [newsId]);

  const title = useMemo(() => (item ? toLocalizedText(item.title, language) : ''), [item, language]);

  if (loading) return <section className="page-wrap"><p>{ui('newsroom', 'loadingList', language)}</p></section>;
  if (error) return <section className="page-wrap"><p className="error-text">{error}</p></section>;
  if (!item) return (
    <section className="page-wrap">
      <p>{ui('newsroom', 'noNews', language) || 'News not found.'}</p>
      <p><button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button></p>
    </section>
  );

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>{title}</h1>
        <Link to="/news" className="btn btn-ghost">Back to News</Link>
      </div>

      <p className="meta">Published {toIsoDate(item.publishedAt || item.createdAt)}</p>
      <article className="surface-card">
        <div className="newsroom-detail-panel__body">
          <p>{toLocalizedText(item.body, language)}</p>
        </div>
      </article>
    </section>
  );
}

export default NewsDetailPage;
