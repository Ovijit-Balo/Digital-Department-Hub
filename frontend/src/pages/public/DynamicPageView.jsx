import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import RichTextPreview from '../../components/ui/RichTextPreview';
import SkeletonCard from '../../components/ui/SkeletonCard';
import useLanguage from '../../hooks/useLanguage';
import usePageMeta from '../../hooks/usePageMeta';
import { getApiErrorMessage } from '../../utils/http';
import { resolveSeoMeta } from '../../utils/seo';
import { toLocalizedText } from '../../utils/localized';

function DynamicPageView() {
  const { slug } = useParams();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(null);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await cmsApi.getPageBySlug(slug);
      setPage(response.data.page || null);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, toLocalizedText(
        { en: 'Failed to load page content.', bn: 'পৃষ্ঠার বিষয়বস্তু লোড করতে ব্যর্থ।' },
        language
      )));
    } finally {
      setLoading(false);
    }
  }, [slug, language]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const meta = resolveSeoMeta(page, { language, bodyField: 'content' });
  usePageMeta(meta);

  return (
    <section className="page-wrap">
      {loading && <SkeletonCard showMedia lines={4} />}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && page && (
        <article className="surface-card">
          <h1>{toLocalizedText(page.title, language)}</h1>
          <RichTextPreview html={toLocalizedText(page.content, language)} />
        </article>
      )}
    </section>
  );
}

export default DynamicPageView;
