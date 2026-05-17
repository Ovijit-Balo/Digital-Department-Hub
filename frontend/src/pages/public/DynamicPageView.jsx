import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import RichTextPreview from '../../components/common/RichTextPreview';
import SkeletonCard from '../../components/common/SkeletonCard';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
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
      setError(getApiErrorMessage(apiError, 'Failed to load page content.'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

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
