import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { toLocalizedText } from '../../utils/localized';

function GalleryDetailPage() {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gallery, setGallery] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const res = await cmsApi.listGalleries({ status: 'published', limit: 100 });
        const items = res.data.items || [];
        const found = items.find((g) => g._id === galleryId || g.slug === galleryId);
        if (mounted) setGallery(found || null);
      } catch (apiError) {
        if (mounted) setError(getApiErrorMessage(apiError, 'Failed to load gallery.'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [galleryId]);

  const title = useMemo(() => toLocalizedText(gallery?.title, language) || ui('gallery', 'untitled', language), [gallery, language]);

  if (loading) return <section className="page-wrap"><p>{ui('gallery', 'loading', language)}</p></section>;
  if (error) return <section className="page-wrap"><p className="error-text">{error}</p></section>;
  if (!gallery) return (
    <section className="page-wrap">
      <p>{ui('gallery', 'noGallery', language)}</p>
      <p><button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button></p>
    </section>
  );

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>{title}</h1>
        <Link to="/gallery" className="btn btn-ghost">{ui('home', 'back', language) || 'Back'}</Link>
      </div>

      <p>{toLocalizedText(gallery.description, language)}</p>

      <div className="gallery-grid">
        {(gallery.items || [])
          .slice()
          .sort((l, r) => (l.order || 0) - (r.order || 0))
          .map((item) => (
            <article key={`${item.mediaUrl}-${item.order}`} className="gallery-item-card">
              {item.mediaType === 'video' ? (
                <video controls src={resolveMediaUrl(item.mediaUrl)} className="gallery-media" />
              ) : (
                <img src={resolveMediaUrl(item.mediaUrl)} alt={toLocalizedText(item.caption, language) || title} className="gallery-media" />
              )}
              <p className="meta">{toLocalizedText(item.caption, language)}</p>
            </article>
          ))}
      </div>
    </section>
  );
}

export default GalleryDetailPage;
