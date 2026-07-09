import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import InlineAlert from '../../components/ui/InlineAlert';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { toLocalizedText } from '../../utils/localized';

function GalleryMediaItem({ item, language, onPreview, onOpenDetail }) {
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
        <video controls src={src} className="gallery-media" onClick={() => onOpenDetail()} />
        <p className="meta">{caption}</p>
      </article>
    );
  }

  return (
    <button
      type="button"
      className="gallery-item-card gallery-item-card--button"
      onClick={() => onOpenDetail()}
    >
      <img
        src={src}
        alt={caption}
        className="gallery-media"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <p className="meta">{caption}</p>
    </button>
  );
}

function GalleryPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collections, setCollections] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const navigate = useNavigate();

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

  const skeletonCollections = useMemo(() => Array.from({ length: 2 }, (_, index) => index), []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return (
    <section className="page-wrap">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">Media Collections</p>
          <h1>{ui('gallery', 'title', language)}</h1>
          <p className="page-title-subtitle">Photo galleries and media from department events</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadCollections}>
          {ui('home', 'refresh', language)}
        </button>
      </header>

      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {loading && (
        <div className="stack-list" aria-label={ui('gallery', 'loading', language)}>
          {skeletonCollections.map((index) => (
            <article key={index} className="surface-card gallery-skeleton-card" aria-hidden="true">
              <div className="skeleton skeleton-line skeleton-line--lg" />
              <div className="skeleton skeleton-line" />
              <div className="gallery-grid">
                {Array.from({ length: 4 }).map((_, itemIndex) => (
                  <div key={itemIndex} className="gallery-skeleton-tile">
                    <div className="skeleton skeleton-media" />
                    <div className="skeleton skeleton-line" />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && !collections.length && (
        <div className="empty-state empty-state--center">
          <div className="empty-state__icon" aria-hidden="true">🖼️</div>
          <p className="empty-state__title">{ui('gallery', 'empty', language)}</p>
          <p className="empty-state__text">No gallery collections published yet.</p>
        </div>
      )}

      <div className="content-list">
        {collections.map((collection) => (
            <article key={collection._id} className="surface-card content-card">
            <div className="content-card__header">
              <h3 className="content-card__title">
                <button type="button" className="btn btn-ghost" onClick={() => navigate(`/gallery/${collection._id}`)}>
                  {toLocalizedText(collection.title, language)}
                </button>
              </h3>
              <span className="content-card__badge content-card__badge--research">
                {collection.items?.length || 0} items
              </span>
            </div>
            <p className="content-card__excerpt">
              {toLocalizedText(collection.description, language)}
            </p>

            <div className="gallery-grid gallery-grid--enhanced">
              {(collection.items || [])
                .slice()
                .sort((left, right) => (left.order || 0) - (right.order || 0))
                .map((item) => (
                  <GalleryMediaItem
                    key={`${item.mediaUrl}-${item.order}`}
                    item={item}
                    language={language}
                    onPreview={setPreviewItem}
                    onOpenDetail={() => navigate(`/gallery/${collection._id}`)}
                  />
                ))}
            </div>
          </article>
        ))}
      </div>

      {previewItem && (
        <button
          type="button"
          className="gallery-modal"
          aria-label="Close image preview"
          onClick={() => setPreviewItem(null)}
        >
          <div className="gallery-modal__dialog" onClick={(event) => event.stopPropagation()}>
            <img
              src={resolveMediaUrl(previewItem.mediaUrl)}
              alt={
                toLocalizedText(previewItem.caption, language) ||
                ui('gallery', 'untitled', language)
              }
              className="gallery-modal__media"
            />
            <div className="gallery-modal__copy">
              <h3>
                {toLocalizedText(previewItem.caption, language) ||
                  ui('gallery', 'untitled', language)}
              </h3>
              <p className="meta">{resolveMediaUrl(previewItem.mediaUrl)}</p>
            </div>
          </div>
        </button>
      )}
    </section>
  );
}

export default GalleryPage;
