import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import InlineAlert from '../../components/common/InlineAlert';
import PaginationBar from '../../components/common/PaginationBar';
import SkeletonList from '../../components/common/SkeletonList';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

const PAGE_SIZE = 6;

function BlogsPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await cmsApi.listBlogs({ status: 'published', limit: PAGE_SIZE, page });
      setItems(response.data.items || []);
      setTotal(Number(response.data.total ?? 0));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load blogs.'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  return (
    <section className="page-wrap">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">Department Blog</p>
          <h1>{ui('blogs', 'title', language)}</h1>
          <p className="page-title-subtitle">Insights, stories, and updates from the department</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadBlogs}>
          {ui('home', 'refresh', language)}
        </button>
      </header>

      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {loading && <SkeletonList count={3} showMedia lines={3} />}
      {!loading && !items.length && (
        <div className="empty-state empty-state--center">
          <div className="empty-state__icon" aria-hidden="true">📝</div>
          <p className="empty-state__title">{ui('blogs', 'empty', language)}</p>
          <p className="empty-state__text">No blog posts published yet.</p>
        </div>
      )}

      <div className="content-list content-list--grid">
        {items.map((item) => (
          <article key={item._id} className="surface-card content-card">
            <div className="content-card__header">
              <h3 className="content-card__title">
                <Link to={`/blogs/${item.slug}`} className="content-card__title-link">
                  {toLocalizedText(item.title, language)}
                </Link>
              </h3>
              <span className="content-card__badge content-card__badge--academic">
                Blog
              </span>
            </div>
            <p className="content-card__excerpt">
              {toLocalizedText(item.excerpt, language)}
            </p>
            <div className="content-card__footer">
              <p className="content-card__meta">
                <span className="content-card__meta-item">
                  <span className="content-card__meta-icon" aria-hidden="true">📅</span>
                  {toIsoDate(item.publishedAt || item.createdAt)}
                </span>
              </p>
              <Link to={`/blogs/${item.slug}`} className="btn btn-ghost">
                {ui('blogs', 'read', language)}
              </Link>
            </div>
          </article>
        ))}
      </div>

      <PaginationBar
        language={language}
        page={page}
        total={total}
        limit={PAGE_SIZE}
        disabled={loading}
        onPageChange={setPage}
      />
    </section>
  );
}

export default BlogsPage;
