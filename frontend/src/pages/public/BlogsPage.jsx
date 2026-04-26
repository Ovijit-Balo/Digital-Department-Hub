import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

function BlogsPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await cmsApi.listBlogs({ status: 'published', limit: 30 });
      setItems(response.data.items || []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load blogs.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>Blog</h1>
        <button type="button" className="btn btn-ghost" onClick={loadBlogs}>
          Refresh
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading blogs...</p>}
      {!loading && !items.length && <p>No blogs published yet.</p>}

      <div className="stack-list">
        {items.map((item) => (
          <article key={item._id} className="surface-card">
            <h3>{toLocalizedText(item.title, language)}</h3>
            <p>{toLocalizedText(item.excerpt, language)}</p>
            <p className="meta">Published: {toIsoDate(item.publishedAt || item.createdAt)}</p>
            <Link to={`/blogs/${item.slug}`} className="btn btn-ghost">
              Read Blog
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default BlogsPage;
