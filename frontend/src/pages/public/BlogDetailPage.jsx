import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import RichTextPreview from '../../components/ui/RichTextPreview';
import useLanguage from '../../hooks/useLanguage';
import usePageMeta from '../../hooks/usePageMeta';
import { getApiErrorMessage } from '../../utils/http';
import { resolveSeoMeta } from '../../utils/seo';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

const T = {
  loadFailed: { en: 'Failed to load blog post.', bn: 'ব্লগ পোস্ট লোড করতে ব্যর্থ।' },
  loading: { en: 'Loading blog post...', bn: 'ব্লগ পোস্ট লোড হচ্ছে...' },
  published: { en: 'Published', bn: 'প্রকাশিত' }
};

function BlogDetailPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
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
      setError(getApiErrorMessage(apiError, t('loadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, language]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const title = useMemo(
    () => (post ? toLocalizedText(post.title, language) : ''),
    [post, language]
  );
  const summary = useMemo(
    () => (post ? toLocalizedText(post.excerpt, language) : ''),
    [post, language]
  );

  usePageMeta(resolveSeoMeta(post, { language, bodyField: 'body' }));

  return (
    <section className="page-wrap">
      {loading && <p>{t('loading')}</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && post && (
        <article className="surface-card">
          <h1>{title}</h1>
          <p className="meta">{t('published')}: {toIsoDate(post.publishedAt || post.createdAt)}</p>
          {summary ? <p className="blog-detail-summary">{summary}</p> : null}
          {post.coverImageUrl ? (
            <img src={resolveMediaUrl(post.coverImageUrl)} alt={title} className="content-detail__cover" />
          ) : null}
          <RichTextPreview html={toLocalizedText(post.body, language)} />
        </article>
      )}
    </section>
  );
}

export default BlogDetailPage;
