import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import PaginationBar from '../../components/common/PaginationBar';
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
      <div className="section-head">
        <h1>{ui('blogs', 'title', language)}</h1>
        <button type="button" className="btn btn-ghost" onClick={loadBlogs}>
          {ui('home', 'refresh', language)}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>{ui('blogs', 'loading', language)}</p>}
      {!loading && !items.length && <p>{ui('blogs', 'empty', language)}</p>}

      <div className="stack-list">
        {items.map((item) => (
          <article key={item._id} className="surface-card">
            <h3>{toLocalizedText(item.title, language)}</h3>
            <p>{toLocalizedText(item.excerpt, language)}</p>
            <p className="meta">
              {ui('newsroom', 'published', language)}: {toIsoDate(item.publishedAt || item.createdAt)}
            </p>
            <Link to={`/blogs/${item.slug}`} className="btn btn-ghost">
              {ui('blogs', 'read', language)}
            </Link>
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
