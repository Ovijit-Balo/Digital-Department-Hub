import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import InlineAlert from '../../components/ui/InlineAlert';
import PaginationBar from '../../components/ui/PaginationBar';
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
const NEWS_FILTERS = ['all', 'announcements', 'events', 'academic', 'research'];

function normalizeFilterValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function getNewsTokens(item) {
  const tokens = new Set();
  const category = normalizeFilterValue(item?.category);

  if (category === 'announcement') {
    tokens.add('announcements');
  } else if (category) {
    tokens.add(category);
  }

  if (Array.isArray(item?.tags)) {
    for (const tag of item.tags) {
      const token = normalizeFilterValue(tag);
      if (token) {
        tokens.add(token === 'announcement' ? 'announcements' : token);
      }
    }
  }

  return Array.from(tokens);
}

function matchesNewsFilter(item, activeFilter) {
  if (activeFilter === 'all') {
    return true;
  }

  return getNewsTokens(item).some((token) => token === activeFilter || token.startsWith(activeFilter));
}

function getNewsBadgeLabel(item) {
  const tokens = getNewsTokens(item);
  const candidate = NEWS_FILTERS.find((filter) => filter !== 'all' && tokens.includes(filter));

  if (tokens.includes('announcements')) {
    return 'Announcements';
  }

  if (candidate === 'announcements') {
    return 'Announcements';
  }

  if (candidate === 'events') {
    return 'Events';
  }

  if (candidate === 'academic') {
    return 'Academic';
  }

  if (candidate === 'research') {
    return 'Research';
  }

  return normalizeFilterValue(item?.category || '') === 'announcement' ? 'Announcements' : '';
}

function getNewsIconLabel(item, language) {
  const title = toLocalizedText(item.title, language).trim();
  return title ? title.slice(0, 1).toUpperCase() : '📰';
}

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
  const [expandedNewsId, setExpandedNewsId] = useState('');
  const [newsSearch, setNewsSearch] = useState('');
  const [activeNewsFilter, setActiveNewsFilter] = useState('all');

  const [newsForm, setNewsForm] = useState({
    slug: '',
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
  }, [blogPage, newsPage]);

  useEffect(() => {
    loadContent();
  }, [loadContent, listRefresh]);

  useEffect(() => {
    setExpandedNewsId('');
  }, [newsPage]);

  useEffect(() => {
    setExpandedNewsId('');
  }, [newsSearch, activeNewsFilter]);

  const visibleNewsItems = useMemo(
    () =>
      newsItems.filter((item) => {
        const searchText = normalizeFilterValue(
          [item.title, item.summary, item.body, item.category, item.tags?.join(' ') || '']
            .map((value) => toLocalizedText(value, language))
            .join(' ')
        );
        const query = normalizeFilterValue(newsSearch);
        return matchesNewsFilter(item, activeNewsFilter) && (!query || searchText.includes(query));
      }),
    [activeNewsFilter, language, newsItems, newsSearch]
  );
  const navigate = useNavigate();

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
        slug: '',
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
      <header className="newsroom-header">
        <div className="newsroom-header__copy">
          <h1>{ui('newsroom', 'title', language)}</h1>
          <p className="newsroom-header__subtitle">Latest updates from the department</p>
        </div>

        <div className="newsroom-header__controls">
          <label className="newsroom-search" htmlFor="newsroom-search">
            <span className="newsroom-search__icon" aria-hidden="true">
              ⌕
            </span>
            <input
              id="newsroom-search"
              type="search"
              placeholder="Search news..."
              value={newsSearch}
              onChange={(event) => setNewsSearch(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="newsroom-refresh-btn"
            onClick={loadContent}
            aria-label={ui('home', 'refresh', language)}
            title={ui('home', 'refresh', language)}
          >
            ↻
          </button>
        </div>
      </header>

      {error && <InlineAlert type="error">{error}</InlineAlert>}

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
                Slug
                <input
                  value={newsForm.slug}
                  onChange={(event) =>
                    setNewsForm((prev) => ({
                      ...prev,
                      slug: event.target.value.toLowerCase().replace(/\s+/g, '-')
                    }))
                  }
                  placeholder="department-announcement"
                  required
                />
              </label>
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

      <div className="newsroom-filterbar" aria-label="News filters">
        {NEWS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`newsroom-filter-pill${activeNewsFilter === filter ? ' is-active' : ''}`}
            onClick={() => setActiveNewsFilter(filter)}
          >
            {filter === 'all'
              ? 'All'
              : filter === 'announcements'
                ? 'Announcements'
                : filter === 'events'
                  ? 'Events'
                  : filter === 'academic'
                    ? 'Academic'
                    : 'Research'}
          </button>
        ))}
      </div>

      <div className="newsroom-layout">
        <div className="newsroom-layout__main">
          <article className="surface-card newsroom-feed-card">
            <div className="section-head section-head-tight newsroom-feed-card__head">
              <h2>{ui('newsroom', 'latestNews', language)}</h2>
              <span className="newsroom-feed-card__count">
                {visibleNewsItems.length} item{visibleNewsItems.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading && (
              <InlineAlert type="info">{ui('newsroom', 'loadingList', language)}</InlineAlert>
            )}

            {!loading && !visibleNewsItems.length && (
              <div className="newsroom-empty-state">
                <div className="newsroom-empty-state__icon" aria-hidden="true">
                  📰
                </div>
                <h3>No news found</h3>
                <p>Check back later for updates.</p>
              </div>
            )}

            {!!visibleNewsItems.length && (
              <div className="newsroom-feed">
                {visibleNewsItems.map((item) => {
                  const isExpanded = expandedNewsId === item._id;
                  const badgeLabel = getNewsBadgeLabel(item);

                  return (
                    <article key={item._id} className={`newsroom-item${isExpanded ? ' is-expanded' : ''}`}>
                      <button
                        type="button"
                        className="newsroom-item__toggle"
                        onClick={() =>
                          setExpandedNewsId((current) => (current === item._id ? '' : item._id))
                        }
                        aria-expanded={isExpanded}
                      >
                        <span className="newsroom-item__icon" aria-hidden="true">
                          {getNewsIconLabel(item, language)}
                        </span>
                        <div className="newsroom-item__body">
                          <div className="newsroom-item__title-row">
                              <h3>
                                <button type="button" className="btn btn-ghost" onClick={() => navigate(`/news/${item.slug || item._id}`)}>
                                  {toLocalizedText(item.title, language)}
                                </button>
                              </h3>
                            {badgeLabel && (
                              <span className="newsroom-item__tag-badge">{badgeLabel}</span>
                            )}
                          </div>
                          <p className="newsroom-item__excerpt">
                            {toLocalizedText(item.summary, language)}
                          </p>
                          <div className="newsroom-item__meta">
                            <span className="newsroom-item__date">
                              <span aria-hidden="true">📅</span>
                              <span>{toIsoDate(item.publishedAt || item.createdAt)}</span>
                            </span>
                            {Array.isArray(item.tags) && item.tags.length > 0 && (
                              <span className="newsroom-item__meta-tag">{item.tags[0]}</span>
                            )}
                          </div>
                        </div>
                        <span className="newsroom-item__chevron" aria-hidden="true">
                          ›
                        </span>
                      </button>

                      <div className={`newsroom-item__details${isExpanded ? ' is-open' : ''}`}>
                        <div className="newsroom-detail-panel">
                          <div className="newsroom-detail-panel__header">
                            <span className="newsroom-detail-panel__badge">News Details</span>
                              <div style={{display: 'flex', gap: '0.5rem'}}>
                                <button
                                  type="button"
                                  className="btn btn-ghost newsroom-detail-panel__collapse"
                                  onClick={() => setExpandedNewsId('')}
                                >
                                  Collapse
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => navigate(`/news/${item.slug || item._id}`)}
                                >
                                  Open page
                                </button>
                              </div>
                          </div>
                          <p className="newsroom-detail-panel__date">
                            Published {toIsoDate(item.publishedAt || item.createdAt)}
                          </p>
                          <p className="newsroom-detail-panel__body">
                            {toLocalizedText(item.body, language)}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <PaginationBar
              language={language}
              page={newsPage}
              total={newsTotal}
              limit={PAGE_SIZE}
              disabled={loading}
              onPageChange={setNewsPage}
            />
          </article>
        </div>

        <aside className="newsroom-layout__sidebar">
          <article className="surface-card newsroom-widget-card">
            <div className="section-head section-head-tight newsroom-widget-card__head">
              <h2>{ui('newsroom', 'featuredBlogs', language)}</h2>
              <span className="newsroom-widget-card__label">Pinned</span>
            </div>

            {loading && (
              <InlineAlert type="info">{ui('newsroom', 'loadingList', language)}</InlineAlert>
            )}
            {!loading && !blogItems.length && (
              <InlineAlert type="info">{ui('newsroom', 'noBlogs', language)}</InlineAlert>
            )}
            {!!blogItems.length && (
              <div className="newsroom-widget-list">
                {blogItems.map((item) => (
                  <article key={item._id} className="newsroom-widget-item">
                    <h3>{toLocalizedText(item.title, language)}</h3>
                    <p>{toLocalizedText(item.excerpt, language)}</p>
                    <p className="meta">{ui('newsroom', 'slug', language)}: {item.slug}</p>
                  </article>
                ))}
              </div>
            )}

            <PaginationBar
              language={language}
              page={blogPage}
              total={blogTotal}
              limit={PAGE_SIZE}
              disabled={loading}
              onPageChange={setBlogPage}
            />
          </article>

          <article className="surface-card newsroom-widget-card">
            <div className="section-head section-head-tight newsroom-widget-card__head">
              <h2>{ui('newsroom', 'galleryHighlights', language)}</h2>
              <span className="newsroom-widget-card__label">Gallery</span>
            </div>

            {!galleryItems.length && (
              <InlineAlert type="info">{ui('newsroom', 'noGallery', language)}</InlineAlert>
            )}
            {!!galleryItems.length && (
              <div className="newsroom-widget-list">
                {galleryItems.map((gallery) => (
                  <article key={gallery._id} className="newsroom-widget-item">
                    <h3>{toLocalizedText(gallery.title, language)}</h3>
                    <p>{toLocalizedText(gallery.description, language)}</p>
                    <p className="meta">
                      {ui('newsroom', 'mediaItems', language)}: {gallery.items?.length || 0}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </article>
        </aside>
      </div>
    </section>
  );
}

export default NewsPage;
