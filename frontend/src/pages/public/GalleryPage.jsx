import { useCallback, useEffect, useState } from 'react';
import { cmsApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalizedText } from '../../utils/localized';

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
        <h1>Gallery</h1>
        <button type="button" className="btn btn-ghost" onClick={loadCollections}>
          Refresh
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading gallery...</p>}
      {!loading && !collections.length && <p>No gallery collections published yet.</p>}

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
                  <article key={`${item.mediaUrl}-${item.order}`} className="gallery-item-card">
                    {item.mediaType === 'video' ? (
                      <video controls src={item.mediaUrl} className="gallery-media" />
                    ) : (
                      <img src={item.mediaUrl} alt={toLocalizedText(item.caption, language)} className="gallery-media" />
                    )}
                    <p className="meta">{toLocalizedText(item.caption, language) || 'Untitled media'}</p>
                  </article>
                ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default GalleryPage;
