import { useCallback, useEffect, useState } from 'react';
import { cmsApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { toLocalizedText } from '../../utils/localized';

function GalleryMediaItem({ item, language }) {
  const [failed, setFailed] = useState(false);
  const src = resolveMediaUrl(item.mediaUrl);
  const caption = toLocalizedText(item.caption, language) || ui('gallery', 'untitled', language);

  if (!src || failed) {
    return (
      <article className="gallery-item-card">
        <div className="gallery-media gallery-media-placeholder" role="img" aria-label={caption} />
        <p className="meta">{ui('gallery', 'mediaMissing', language)}</p>
        <p className="meta">{caption}</p>
      </article>
    );
  }

  if (item.mediaType === 'video') {
    return (
      <article className="gallery-item-card">
        <video controls src={src} className="gallery-media" />
        <p className="meta">{caption}</p>
      </article>
    );
  }

  return (
    <article className="gallery-item-card">
      <img
        src={src}
        alt={caption}
        className="gallery-media"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <p className="meta">{caption}</p>
    </article>
  );
}

function GalleryPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collections, setCollections] = useState([]);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await cmsApi.listGalleries({ status: 'published', limit: 40 });
      setCollections(response.data.items || []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load galleries.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>{ui('gallery', 'title', language)}</h1>
        <button type="button" className="btn btn-ghost" onClick={loadCollections}>
          {ui('home', 'refresh', language)}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>{ui('gallery', 'loading', language)}</p>}
      {!loading && !collections.length && <p>{ui('gallery', 'empty', language)}</p>}

      <div className="stack-list">
        {collections.map((collection) => (
          <article key={collection._id} className="surface-card">
            <h3>{toLocalizedText(collection.title, language)}</h3>
            <p>{toLocalizedText(collection.description, language)}</p>

            <div className="gallery-grid">
              {(collection.items || [])
                .slice()
                .sort((left, right) => (left.order || 0) - (right.order || 0))
                .map((item) => (
                  <GalleryMediaItem key={`${item.mediaUrl}-${item.order}`} item={item} language={language} />
                ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default GalleryPage;
