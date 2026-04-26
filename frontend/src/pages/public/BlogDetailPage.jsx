import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import RichTextPreview from '../../components/common/RichTextPreview';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

function BlogDetailPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [post, setPost] = useState(null);

  const loadPost = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await cmsApi.getBlogBySlug(slug);
      setPost(response.data.post || null);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load blog post.'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  return (
    <section className="page-wrap">
      {loading && <p>Loading blog post...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && post && (
        <article className="surface-card">
          <h1>{toLocalizedText(post.title, language)}</h1>
          <p className="meta">Published: {toIsoDate(post.publishedAt || post.createdAt)}</p>
          <RichTextPreview html={toLocalizedText(post.body, language)} />
        </article>
      )}
    </section>
  );
}

export default BlogDetailPage;
