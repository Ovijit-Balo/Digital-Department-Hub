import { useCallback, useEffect, useState } from 'react';
import { cmsApi } from '../../api/modules';
import PaginationBar from '../../components/common/PaginationBar';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

const initialLocalized = {
  en: '',
  bn: ''
};

const PAGE_SIZE = 6;

function NewsPage() {
  const { language } = useLanguage();
  const canPublish = useRole('admin', 'editor');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newsItems, setNewsItems] = useState([]);
  const [blogItems, setBlogItems] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [newsPage, setNewsPage] = useState(1);
  const [blogPage, setBlogPage] = useState(1);
  const [newsTotal, setNewsTotal] = useState(0);
  const [blogTotal, setBlogTotal] = useState(0);
  const [listRefresh, setListRefresh] = useState(0);
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

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [newsResponse, blogResponse, galleryResponse] = await Promise.all([
        cmsApi.listNews({ status: 'published', limit: PAGE_SIZE, page: newsPage }),
        cmsApi.listBlogs({ status: 'published', limit: PAGE_SIZE, page: blogPage }),
        cmsApi.listGalleries({ status: 'published', limit: 12 })
      ]);

      setNewsItems(newsResponse.data.items || []);
      setBlogItems(blogResponse.data.items || []);
      setGalleryItems(galleryResponse.data.items || []);
      setNewsTotal(Number(newsResponse.data.total ?? 0));
      setBlogTotal(Number(blogResponse.data.total ?? 0));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load newsroom content.'));
    } finally {
      setLoading(false);
    }
  }, [blogPage, listRefresh, newsPage]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

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
      setNewsPage(1);
      setBlogPage(1);
      setListRefresh((value) => value + 1);
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
      setNewsPage(1);
      setBlogPage(1);
      setListRefresh((value) => value + 1);
    } catch (apiError) {
      setSubmitMessage(getApiErrorMessage(apiError, 'Failed to publish blog post.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>{ui('newsroom', 'title', language)}</h1>
        <button type="button" className="btn btn-ghost" onClick={loadContent}>
          {ui('home', 'refresh', language)}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {canPublish && (
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>{ui('newsroom', 'composer', language)}</h3>
            <div className="action-row">
              <button
                type="button"
                className={`btn ${activeComposer === 'news' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveComposer('news')}
              >
                {ui('newsroom', 'news', language)}
              </button>
              <button
                type="button"
                className={`btn ${activeComposer === 'blog' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveComposer('blog')}
              >
                {ui('newsroom', 'blog', language)}
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
          <h2>{ui('newsroom', 'latestNews', language)}</h2>
          {loading && <p>{ui('newsroom', 'loadingList', language)}</p>}
          {!loading && !newsItems.length && <p>{ui('newsroom', 'noNews', language)}</p>}
          {newsItems.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <h3>{toLocalizedText(item.title, language)}</h3>
              <p>{toLocalizedText(item.summary, language)}</p>
              <p className="meta">
                {ui('newsroom', 'published', language)}: {toIsoDate(item.publishedAt || item.createdAt)}
              </p>
            </article>
          ))}
          <PaginationBar
            language={language}
            page={newsPage}
            total={newsTotal}
            limit={PAGE_SIZE}
            disabled={loading}
            onPageChange={setNewsPage}
          />
        </article>

        <article className="surface-card">
          <h2>{ui('newsroom', 'featuredBlogs', language)}</h2>
          {loading && <p>{ui('newsroom', 'loadingList', language)}</p>}
          {!loading && !blogItems.length && <p>{ui('newsroom', 'noBlogs', language)}</p>}
          {blogItems.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <h3>{toLocalizedText(item.title, language)}</h3>
              <p>{toLocalizedText(item.excerpt, language)}</p>
              <p className="meta">
                {ui('newsroom', 'slug', language)}: {item.slug}
              </p>
            </article>
          ))}
          <PaginationBar
            language={language}
            page={blogPage}
            total={blogTotal}
            limit={PAGE_SIZE}
            disabled={loading}
            onPageChange={setBlogPage}
          />
        </article>

        <article className="surface-card">
          <h2>{ui('newsroom', 'galleryHighlights', language)}</h2>
          {!galleryItems.length && <p>{ui('newsroom', 'noGallery', language)}</p>}
          {galleryItems.map((gallery) => (
            <article key={gallery._id} className="surface-card inner-card">
              <h3>{toLocalizedText(gallery.title, language)}</h3>
              <p>{toLocalizedText(gallery.description, language)}</p>
              <p className="meta">
                {ui('newsroom', 'mediaItems', language)}: {gallery.items?.length || 0}
              </p>
            </article>
          ))}
        </article>
      </div>
    </section>
  );
}

export default NewsPage;
