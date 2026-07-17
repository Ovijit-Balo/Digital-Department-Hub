import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import usePageMeta from '../../hooks/usePageMeta';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { toLocalizedText } from '../../utils/localized';

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function GalleryDetailPage() {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gallery, setGallery] = useState(null);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = OBJECT_ID_PATTERN.test(galleryId)
        ? await cmsApi.getGalleryById(galleryId)
        : await cmsApi.getGalleryBySlug(galleryId);
      setGallery(response.data.gallery || null);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, toLocalizedText(
        { en: 'Failed to load gallery.', bn: 'গ্যালারি লোড করতে ব্যর্থ।' },
        language
      )));
    } finally {
      setLoading(false);
    }
  }, [galleryId, language]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const title = useMemo(
    () => toLocalizedText(gallery?.title, language) || ui('gallery', 'untitled', language),
    [gallery, language]
  );
  const description = useMemo(
    () => toLocalizedText(gallery?.description, language),
    [gallery, language]
  );

  usePageMeta({ title, description: description || undefined });

  if (loading) {
    return (
      <section className="page-wrap">
        <p>{ui('gallery', 'loading', language)}</p>
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

  if (!gallery) {
    return (
      <section className="page-wrap">
        <p>{ui('gallery', 'noGallery', language)}</p>
        <p>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            {ui('home', 'back', language) || 'Back'}
          </button>
        </p>
      </section>
    );
  }

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>{title}</h1>
        <Link to="/gallery" className="btn btn-ghost">
          {ui('home', 'back', language) || 'Back'}
        </Link>
      </div>

      {description ? <p>{description}</p> : null}

      <div className="gallery-grid">
        {(gallery.items || [])
          .slice()
          .sort((left, right) => (left.order || 0) - (right.order || 0))
          .map((item) => (
            <article key={`${item.mediaUrl}-${item.order}`} className="gallery-item-card">
              {item.mediaType === 'video' ? (
                <video controls src={resolveMediaUrl(item.mediaUrl)} className="gallery-media" />
              ) : (
                <img
                  src={resolveMediaUrl(item.mediaUrl)}
                  alt={toLocalizedText(item.caption, language) || title}
                  className="gallery-media"
                />
              )}
              <p className="meta">{toLocalizedText(item.caption, language)}</p>
            </article>
          ))}
      </div>
    </section>
  );
}

export default GalleryDetailPage;
