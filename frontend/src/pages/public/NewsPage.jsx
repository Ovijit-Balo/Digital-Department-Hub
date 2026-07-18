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
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

const initialLocalized = {
  en: '',
  bn: ''
};

const PAGE_SIZE = 6;
const NEWS_FILTERS = ['all', 'announcements', 'events', 'academic', 'research'];

const T = {
  loadFailed: { en: 'Failed to load newsroom content.', bn: 'নিউজরুম বিষয়বস্তু লোড করতে ব্যর্থ।' },
  newsPublished: { en: 'News post published successfully.', bn: 'সংবাদ পোস্ট সফলভাবে প্রকাশিত হয়েছে।' },
  blogPublished: { en: 'Blog post published successfully.', bn: 'ব্লগ পোস্ট সফলভাবে প্রকাশিত হয়েছে।' },
  publishNewsFailed: { en: 'Failed to publish news post.', bn: 'সংবাদ পোস্ট প্রকাশ করতে ব্যর্থ।' },
  publishBlogFailed: { en: 'Failed to publish blog post.', bn: 'ব্লগ পোস্ট প্রকাশ করতে ব্যর্থ।' },
  searchNews: { en: 'Search news...', bn: 'সংবাদ খুঁজুন...' },
  newsDetails: { en: 'News Details', bn: 'সংবাদ বিবরণ' },
  collapse: { en: 'Collapse', bn: 'গুটিয়ে নিন' },
  openPage: { en: 'Open page', bn: 'পৃষ্ঠা খুলুন' },
  published: { en: 'Published', bn: 'প্রকাশিত' },
  pinned: { en: 'Pinned', bn: 'পিন করা' },
  gallery: { en: 'Gallery', bn: 'গ্যালারি' },
  subtitle: { en: 'Latest updates from the department', bn: 'বিভাগ থেকে সর্বশেষ হালনাগাদ' },
  newsFilters: { en: 'News filters', bn: 'সংবাদ ফিল্টার' },
  noNewsFound: { en: 'No news found', bn: 'কোনো সংবাদ পাওয়া যায়নি' },
  checkBackLater: { en: 'Check back later for updates.', bn: 'হালনাগাদের জন্য পরে আবার দেখুন।' },
  item: { en: 'item', bn: 'আইটেম' },
  items: { en: 'items', bn: 'আইটেম' },
  slug: { en: 'Slug', bn: 'স্লাগ' },
  newsTitleEn: { en: 'News title (EN)', bn: 'সংবাদ শিরোনাম (EN)' },
  newsTitleBn: { en: 'News title (BN)', bn: 'সংবাদ শিরোনাম (BN)' },
  summaryEn: { en: 'Summary (EN)', bn: 'সারসংক্ষেপ (EN)' },
  summaryBn: { en: 'Summary (BN)', bn: 'সারসংক্ষেপ (BN)' },
  bodyEn: { en: 'Body (EN)', bn: 'মূল অংশ (EN)' },
  bodyBn: { en: 'Body (BN)', bn: 'মূল অংশ (BN)' },
  blogTitleEn: { en: 'Blog title (EN)', bn: 'ব্লগ শিরোনাম (EN)' },
  blogTitleBn: { en: 'Blog title (BN)', bn: 'ব্লগ শিরোনাম (BN)' },
  excerptEn: { en: 'Excerpt (EN)', bn: 'উদ্ধৃতাংশ (EN)' },
  excerptBn: { en: 'Excerpt (BN)', bn: 'উদ্ধৃতাংশ (BN)' },
  publishing: { en: 'Publishing...', bn: 'প্রকাশ হচ্ছে...' },
  publishNews: { en: 'Publish News', bn: 'সংবাদ প্রকাশ করুন' },
  publishBlog: { en: 'Publish Blog', bn: 'ব্লগ প্রকাশ করুন' }
};

const FILTER_LABELS = {
  all: { en: 'All', bn: 'সব' },
  announcements: { en: 'Announcements', bn: 'ঘোষণা' },
  events: { en: 'Events', bn: 'ইভেন্ট' },
  academic: { en: 'Academic', bn: 'একাডেমিক' },
  research: { en: 'Research', bn: 'গবেষণা' }
};

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

function getNewsBadgeKey(item) {
  const tokens = getNewsTokens(item);
  const candidate = NEWS_FILTERS.find((filter) => filter !== 'all' && tokens.includes(filter));

  if (tokens.includes('announcements')) {
    return 'announcements';
  }

  if (candidate === 'announcements' || candidate === 'events' || candidate === 'academic' || candidate === 'research') {
    return candidate;
  }

  return normalizeFilterValue(item?.category || '') === 'announcement' ? 'announcements' : '';
}

function getNewsIconLabel(item, language) {
  const title = toLocalizedText(item.title, language).trim();
  return title ? title.slice(0, 1).toUpperCase() : '📰';
}

function NewsPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
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
      setError(getApiErrorMessage(apiError, t('loadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogPage, newsPage, language]);

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
      setSubmitMessage(t('newsPublished'));
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
      setSubmitMessage(getApiErrorMessage(apiError, t('publishNewsFailed')));
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
      setSubmitMessage(t('blogPublished'));
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
      setSubmitMessage(getApiErrorMessage(apiError, t('publishBlogFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-wrap">
      <header className="newsroom-header">
        <div className="newsroom-header__copy">
          <h1>{ui('newsroom', 'title', language)}</h1>
          <p className="newsroom-header__subtitle">{t('subtitle')}</p>
        </div>

        <div className="newsroom-header__controls">
          <label className="newsroom-search" htmlFor="newsroom-search">
            <span className="newsroom-search__icon" aria-hidden="true">
              ⌕
            </span>
            <input
              id="newsroom-search"
              type="search"
              placeholder={t('searchNews')}
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
                {t('slug')}
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
                {t('newsTitleEn')}
                <input
                  value={newsForm.title.en}
                  onChange={(event) => onNewsLocalizedChange('title', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                {t('newsTitleBn')}
                <input
                  value={newsForm.title.bn}
                  onChange={(event) => onNewsLocalizedChange('title', 'bn', event.target.value)}
                  required
                />
              </label>
              <label>
                {t('summaryEn')}
                <textarea
                  value={newsForm.summary.en}
                  onChange={(event) => onNewsLocalizedChange('summary', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                {t('summaryBn')}
                <textarea
                  value={newsForm.summary.bn}
                  onChange={(event) => onNewsLocalizedChange('summary', 'bn', event.target.value)}
                  required
                />
              </label>
              <label>
                {t('bodyEn')}
                <textarea
                  value={newsForm.body.en}
                  onChange={(event) => onNewsLocalizedChange('body', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                {t('bodyBn')}
                <textarea
                  value={newsForm.body.bn}
                  onChange={(event) => onNewsLocalizedChange('body', 'bn', event.target.value)}
                  required
                />
              </label>

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? t('publishing') : t('publishNews')}
              </button>
            </form>
          ) : (
            <form className="form-grid" onSubmit={submitBlog}>
              <label>
                {t('slug')}
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
                {t('blogTitleEn')}
                <input
                  value={blogForm.title.en}
                  onChange={(event) => onBlogLocalizedChange('title', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                {t('blogTitleBn')}
                <input
                  value={blogForm.title.bn}
                  onChange={(event) => onBlogLocalizedChange('title', 'bn', event.target.value)}
                  required
                />
              </label>
              <label>
                {t('excerptEn')}
                <textarea
                  value={blogForm.excerpt.en}
                  onChange={(event) => onBlogLocalizedChange('excerpt', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                {t('excerptBn')}
                <textarea
                  value={blogForm.excerpt.bn}
                  onChange={(event) => onBlogLocalizedChange('excerpt', 'bn', event.target.value)}
                  required
                />
              </label>
              <label>
                {t('bodyEn')}
                <textarea
                  value={blogForm.body.en}
                  onChange={(event) => onBlogLocalizedChange('body', 'en', event.target.value)}
                  required
                />
              </label>
              <label>
                {t('bodyBn')}
                <textarea
                  value={blogForm.body.bn}
                  onChange={(event) => onBlogLocalizedChange('body', 'bn', event.target.value)}
                  required
                />
              </label>

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? t('publishing') : t('publishBlog')}
              </button>
            </form>
          )}

          {submitMessage && <p className="meta">{submitMessage}</p>}
        </article>
      )}

      <div className="newsroom-filterbar" aria-label={t('newsFilters')}>
        {NEWS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`newsroom-filter-pill${activeNewsFilter === filter ? ' is-active' : ''}`}
            onClick={() => setActiveNewsFilter(filter)}
          >
            {toLocalizedText(FILTER_LABELS[filter], language)}
          </button>
        ))}
      </div>

      <div className="newsroom-layout">
        <div className="newsroom-layout__main">
          <article className="surface-card newsroom-feed-card">
            <div className="section-head section-head-tight newsroom-feed-card__head">
              <h2>{ui('newsroom', 'latestNews', language)}</h2>
              <span className="newsroom-feed-card__count">
                {visibleNewsItems.length} {visibleNewsItems.length === 1 ? t('item') : t('items')}
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
                <h3>{t('noNewsFound')}</h3>
                <p>{t('checkBackLater')}</p>
              </div>
            )}

            {!!visibleNewsItems.length && (
              <div className="newsroom-feed">
                {visibleNewsItems.map((item) => {
                  const isExpanded = expandedNewsId === item._id;
                  const badgeKey = getNewsBadgeKey(item);
                  const badgeLabel = badgeKey ? toLocalizedText(FILTER_LABELS[badgeKey], language) : '';

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
                        {item.coverImageUrl ? (
                          <img
                            src={resolveMediaUrl(item.coverImageUrl)}
                            alt=""
                            className="newsroom-item__thumb"
                            loading="lazy"
                          />
                        ) : (
                          <span className="newsroom-item__icon" aria-hidden="true">
                            {getNewsIconLabel(item, language)}
                          </span>
                        )}
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
                            <span className="newsroom-detail-panel__badge">{t('newsDetails')}</span>
                              <div style={{display: 'flex', gap: '0.5rem'}}>
                                <button
                                  type="button"
                                  className="btn btn-ghost newsroom-detail-panel__collapse"
                                  onClick={() => setExpandedNewsId('')}
                                >
                                  {t('collapse')}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => navigate(`/news/${item.slug || item._id}`)}
                                >
                                  {t('openPage')}
                                </button>
                              </div>
                          </div>
                          <p className="newsroom-detail-panel__date">
                            {t('published')} {toIsoDate(item.publishedAt || item.createdAt)}
                          </p>
                          {item.coverImageUrl && (
                            <img
                              src={resolveMediaUrl(item.coverImageUrl)}
                              alt={toLocalizedText(item.title, language)}
                              className="newsroom-detail-panel__cover"
                              loading="lazy"
                            />
                          )}
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
              <span className="newsroom-widget-card__label">{t('pinned')}</span>
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
                  <article
                    key={item._id}
                    className="newsroom-widget-item newsroom-widget-item--link"
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/blogs/${item.slug || item._id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/blogs/${item.slug || item._id}`);
                      }
                    }}
                  >
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
              <span className="newsroom-widget-card__label">{t('gallery')}</span>
            </div>

            {!galleryItems.length && (
              <InlineAlert type="info">{ui('newsroom', 'noGallery', language)}</InlineAlert>
            )}
            {!!galleryItems.length && (
              <div className="newsroom-widget-list">
                {galleryItems.map((gallery) => {
                  const firstImage = (gallery.items || []).find(
                    (media) => media.mediaType !== 'video' && (media.thumbnailUrl || media.mediaUrl)
                  );

                  return (
                    <article
                      key={gallery._id}
                      className="newsroom-widget-item newsroom-widget-item--link"
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(`/gallery/${gallery.slug || gallery._id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/gallery/${gallery.slug || gallery._id}`);
                        }
                      }}
                    >
                      {firstImage && (
                        <img
                          src={resolveMediaUrl(firstImage.thumbnailUrl || firstImage.mediaUrl)}
                          alt={toLocalizedText(gallery.title, language)}
                          className="newsroom-widget-item__thumb"
                          loading="lazy"
                        />
                      )}
                      <h3>{toLocalizedText(gallery.title, language)}</h3>
                      <p>{toLocalizedText(gallery.description, language)}</p>
                      <p className="meta">
                        {ui('newsroom', 'mediaItems', language)}: {gallery.items?.length || 0}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </aside>
      </div>
    </section>
  );
}

export default NewsPage;
