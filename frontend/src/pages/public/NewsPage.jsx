import { useEffect, useState } from 'react';
import { cmsApi } from '../../api/modules';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

const initialLocalized = {
  en: '',
  bn: ''
};

function NewsPage() {
  const { language } = useLanguage();
  const canPublish = useRole('admin', 'editor');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newsItems, setNewsItems] = useState([]);
  const [blogItems, setBlogItems] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [activeComposer, setActiveComposer] = useState('news');

  const [newsForm, setNewsForm] = useState({
    title: { ...initialLocalized },
    summary: { ...initialLocalized },
    body: { ...initialLocalized },
    status: 'published'
  });
  const [blogForm, setBlogForm] = useState({
    slug: '',
    title: { ...initialLocalized },
    excerpt: { ...initialLocalized },
    body: { ...initialLocalized },
    status: 'published'
  });
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadContent = async () => {
    setLoading(true);
    setError('');

    try {
      const [newsResponse, blogResponse, galleryResponse] = await Promise.all([
        cmsApi.listNews({ status: 'published', limit: 12 }),
        cmsApi.listBlogs({ status: 'published', limit: 12 }),
        cmsApi.listGalleries({ status: 'published', limit: 12 })
      ]);

      setNewsItems(newsResponse.data.items || []);
      setBlogItems(blogResponse.data.items || []);
      setGalleryItems(galleryResponse.data.items || []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load newsroom content.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const onNewsLocalizedChange = (field, locale, value) => {
    setNewsForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [locale]: value
      }
    }));
  };

  const onBlogLocalizedChange = (field, locale, value) => {
    setBlogForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [locale]: value
      }
    }));
  };

  const submitNews = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitMessage('');

    try {
      await cmsApi.createNews({ ...newsForm, tags: [] });
      setSubmitMessage('News post published successfully.');
      setNewsForm({
        title: { ...initialLocalized },
        summary: { ...initialLocalized },
        body: { ...initialLocalized },
        status: 'published'
      });
      await loadContent();
    } catch (apiError) {
      setSubmitMessage(getApiErrorMessage(apiError, 'Failed to publish news post.'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitBlog = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitMessage('');

    try {
      await cmsApi.createBlog({ ...blogForm, tags: [] });
      setSubmitMessage('Blog post published successfully.');
      setBlogForm({
        slug: '',
        title: { ...initialLocalized },
        excerpt: { ...initialLocalized },
        body: { ...initialLocalized },
        status: 'published'
      });
      await loadContent();
    } catch (apiError) {
      setSubmitMessage(getApiErrorMessage(apiError, 'Failed to publish blog post.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>Newsroom</h1>
        <button type="button" className="btn btn-ghost" onClick={loadContent}>
          Refresh
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {canPublish && (
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>Content Composer</h3>
            <div className="action-row">
              <button
                type="button"
                className={`btn ${activeComposer === 'news' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveComposer('news')}
              >
                News
              </button>
              <button
                type="button"
                className={`btn ${activeComposer === 'blog' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveComposer('blog')}
              >
                Blog
              </button>
            </div>
          </div>

          {activeComposer === 'news' ? (
            <form className="form-grid" onSubmit={submitNews}>
              <label>
                News title (EN)
                <input
                  value={newsForm.title.en}
                  onChange={(event) => onNewsLocalizedChange('title', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                News title (BN)
                <input
                  value={newsForm.title.bn}
                  onChange={(event) => onNewsLocalizedChange('title', 'bn', event.target.value)}
                  required
                />
              </label>
              <label>
                Summary (EN)
                <textarea
                  value={newsForm.summary.en}
                  onChange={(event) => onNewsLocalizedChange('summary', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                Summary (BN)
                <textarea
                  value={newsForm.summary.bn}
                  onChange={(event) => onNewsLocalizedChange('summary', 'bn', event.target.value)}
                  required
                />
              </label>
              <label>
                Body (EN)
                <textarea
                  value={newsForm.body.en}
                  onChange={(event) => onNewsLocalizedChange('body', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                Body (BN)
                <textarea
                  value={newsForm.body.bn}
                  onChange={(event) => onNewsLocalizedChange('body', 'bn', event.target.value)}
                  required
                />
              </label>

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish News'}
              </button>
            </form>
          ) : (
            <form className="form-grid" onSubmit={submitBlog}>
              <label>
                Slug
                <input
                  value={blogForm.slug}
                  onChange={(event) =>
                    setBlogForm((prev) => ({
                      ...prev,
                      slug: event.target.value.toLowerCase().replace(/\s+/g, '-')
                    }))
                  }
                  placeholder="campus-innovation-week"
                  required
                />
              </label>
              <label>
                Blog title (EN)
                <input
                  value={blogForm.title.en}
                  onChange={(event) => onBlogLocalizedChange('title', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                Blog title (BN)
                <input
                  value={blogForm.title.bn}
                  onChange={(event) => onBlogLocalizedChange('title', 'bn', event.target.value)}
                  required
                />
              </label>
              <label>
                Excerpt (EN)
                <textarea
                  value={blogForm.excerpt.en}
                  onChange={(event) => onBlogLocalizedChange('excerpt', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                Excerpt (BN)
                <textarea
                  value={blogForm.excerpt.bn}
                  onChange={(event) => onBlogLocalizedChange('excerpt', 'bn', event.target.value)}
                  required
                />
              </label>
              <label>
                Body (EN)
                <textarea
                  value={blogForm.body.en}
                  onChange={(event) => onBlogLocalizedChange('body', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                Body (BN)
                <textarea
                  value={blogForm.body.bn}
                  onChange={(event) => onBlogLocalizedChange('body', 'bn', event.target.value)}
                  required
                />
              </label>

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish Blog'}
              </button>
            </form>
          )}

          {submitMessage && <p className="meta">{submitMessage}</p>}
        </article>
      )}

      <div className="stack-list">
        <article className="surface-card">
          <h2>Latest News</h2>
          {loading && <p>Loading...</p>}
          {!loading && !newsItems.length && <p>No news found.</p>}
          {newsItems.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <h3>{toLocalizedText(item.title, language)}</h3>
              <p>{toLocalizedText(item.summary, language)}</p>
              <p className="meta">Published: {toIsoDate(item.publishedAt || item.createdAt)}</p>
            </article>
          ))}
        </article>

        <article className="surface-card">
          <h2>Featured Blogs</h2>
          {!blogItems.length && <p>No blog entries found yet.</p>}
          {blogItems.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <h3>{toLocalizedText(item.title, language)}</h3>
              <p>{toLocalizedText(item.excerpt, language)}</p>
              <p className="meta">Slug: {item.slug}</p>
            </article>
          ))}
        </article>

        <article className="surface-card">
          <h2>Gallery Highlights</h2>
          {!galleryItems.length && <p>No gallery collections published yet.</p>}
          {galleryItems.map((gallery) => (
            <article key={gallery._id} className="surface-card inner-card">
              <h3>{toLocalizedText(gallery.title, language)}</h3>
              <p>{toLocalizedText(gallery.description, language)}</p>
              <p className="meta">Media items: {gallery.items?.length || 0}</p>
            </article>
          ))}
        </article>
      </div>
    </section>
  );
}

export default NewsPage;
