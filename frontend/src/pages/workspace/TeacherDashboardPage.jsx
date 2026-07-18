import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, cmsApi, eventApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime, toLocalizedText } from '../../utils/localized';

const POPULAR_TYPES = [
  { key: 'news', label: { en: 'News', bn: 'সংবাদ' }, publicPath: (item) => `/news/${item.slug || item.entityId}` },
  { key: 'blog', label: { en: 'Blogs', bn: 'ব্লগ' }, publicPath: (item) => `/blogs/${item.slug}` },
  { key: 'gallery', label: { en: 'Galleries', bn: 'গ্যালারি' }, publicPath: (item) => `/gallery/${item.slug || item.entityId}` },
  { key: 'page', label: { en: 'Pages', bn: 'পাতা' }, publicPath: (item) => `/pages/${item.slug}` }
];

const VIEW_SUMMARY_META = [
  { key: 'news', label: { en: 'News', bn: 'সংবাদ' } },
  { key: 'blog', label: { en: 'Blogs', bn: 'ব্লগ' } },
  { key: 'gallery', label: { en: 'Galleries', bn: 'গ্যালারি' } },
  { key: 'page', label: { en: 'Pages', bn: 'পাতা' } }
];

const T = {
  title: { en: 'Teacher Dashboard', bn: 'শিক্ষক ড্যাশবোর্ড' },
  refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
  lead: {
    en: 'Editorial workspace for classroom-facing content, departmental announcements, and publication readiness.',
    bn: 'শ্রেণিকক্ষ-সংক্রান্ত কনটেন্ট, বিভাগীয় ঘোষণা ও প্রকাশনার প্রস্তুতির জন্য সম্পাদকীয় ওয়ার্কস্পেস।'
  },
  loading: { en: 'Loading teacher workspace...', bn: 'শিক্ষক ওয়ার্কস্পেস লোড হচ্ছে...' },
  contentViews: { en: 'Content Views', bn: 'কনটেন্ট ভিউ' },
  total: { en: 'total', bn: 'মোট' },
  analyticsUnavailable: { en: 'View analytics are unavailable right now.', bn: 'ভিউ অ্যানালিটিক্স এখন উপলব্ধ নয়।' },
  noViewsRecorded: {
    en: 'No content views recorded yet. Counts appear as visitors open published items.',
    bn: 'এখনও কোনো কনটেন্ট ভিউ রেকর্ড হয়নি। দর্শক প্রকাশিত আইটেম খুললে গণনা দেখা যাবে।'
  },
  mostViewed: { en: 'Most Viewed Content', bn: 'সর্বাধিক দেখা কনটেন্ট' },
  loadingAnalytics: { en: 'Loading view analytics...', bn: 'ভিউ অ্যানালিটিক্স লোড হচ্ছে...' },
  noViewsForType: { en: 'No views recorded for', bn: 'কোনো ভিউ রেকর্ড হয়নি:' },
  yet: { en: 'yet.', bn: '' },
  untitled: { en: 'Untitled', bn: 'শিরোনামহীন' },
  signedInViewers: { en: 'signed-in viewers', bn: 'সাইন-ইন দর্শক' },
  viewsWord: { en: 'views', bn: 'ভিউ' },
  viewWord: { en: 'view', bn: 'ভিউ' },
  quickActions: { en: 'Teacher Quick Actions', bn: 'শিক্ষক দ্রুত পদক্ষেপ' },
  msgLoadFailed: { en: 'Failed to load teacher dashboard.', bn: 'শিক্ষক ড্যাশবোর্ড লোড করতে ব্যর্থ।' },
  // quick links
  openCms: { en: 'Open CMS Studio', bn: 'সিএমএস স্টুডিও খুলুন' },
  reviewScholarships: { en: 'Review Scholarships', bn: 'বৃত্তি পর্যালোচনা' },
  previewAnnouncements: { en: 'Preview Announcements', bn: 'ঘোষণা প্রিভিউ' },
  previewBlogs: { en: 'Preview Blogs', bn: 'ব্লগ প্রিভিউ' },
  previewGallery: { en: 'Preview Gallery', bn: 'গ্যালারি প্রিভিউ' },
  // cards
  draftPages: { en: 'Draft Pages', bn: 'খসড়া পাতা' },
  draftPagesSub: { en: 'Department pages waiting for publication', bn: 'প্রকাশের অপেক্ষায় থাকা বিভাগীয় পাতা' },
  draftNews: { en: 'Draft News', bn: 'খসড়া সংবাদ' },
  draftNewsSub: { en: 'News items prepared by the editorial team', bn: 'সম্পাদকীয় দল প্রস্তুত করা সংবাদ' },
  draftBlogs: { en: 'Draft Blogs', bn: 'খসড়া ব্লগ' },
  draftBlogsSub: { en: 'Blog posts pending final review', bn: 'চূড়ান্ত পর্যালোচনার অপেক্ষায় ব্লগ পোস্ট' },
  draftGalleries: { en: 'Draft Galleries', bn: 'খসড়া গ্যালারি' },
  draftGalleriesSub: { en: 'Gallery collections awaiting release', bn: 'প্রকাশের অপেক্ষায় গ্যালারি সংগ্রহ' },
  publishedAnnouncements: { en: 'Published Announcements', bn: 'প্রকাশিত ঘোষণা' },
  publishedAnnouncementsSub: { en: 'Announcements visible to students', bn: 'শিক্ষার্থীদের কাছে দৃশ্যমান ঘোষণা' },
  publishedEvents: { en: 'Published Events', bn: 'প্রকাশিত ইভেন্ট' },
  publishedEventsSub: { en: 'Events currently open to the public', bn: 'বর্তমানে জনসাধারণের জন্য খোলা ইভেন্ট' },
  // editorial action queue (author-scoped)
  editorialQueue: { en: 'My Editorial Queue', bn: 'আমার সম্পাদকীয় সারি' },
  myDrafts: { en: 'My Drafts', bn: 'আমার খসড়া' },
  scheduledPublishes: { en: 'Scheduled to Publish', bn: 'প্রকাশের জন্য নির্ধারিত' },
  noDrafts: { en: 'No drafts waiting. Everything you started is published.', bn: 'কোনো খসড়া অপেক্ষমাণ নেই। আপনি শুরু করা সবকিছু প্রকাশিত।' },
  noScheduled: { en: 'Nothing scheduled ahead.', bn: 'সামনে কিছু নির্ধারিত নেই।' },
  kindPage: { en: 'Page', bn: 'পাতা' },
  kindNews: { en: 'News', bn: 'সংবাদ' },
  kindBlog: { en: 'Blog', bn: 'ব্লগ' },
  kindGallery: { en: 'Gallery', bn: 'গ্যালারি' },
  editLabel: { en: 'Edit', bn: 'সম্পাদনা' },
  goesLive: { en: 'Goes live', bn: 'প্রকাশিত হবে' }
};

function TeacherDashboardPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  // Teachers who also carry the reviewer role evaluate scholarship applications
  // from the public scholarship workflow, so surface a direct link for them.
  const canReviewScholarships = useRole('reviewer', 'admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({
    draftPages: 0,
    draftNews: 0,
    draftBlogs: 0,
    draftGalleries: 0,
    publishedAnnouncements: 0,
    publishedEvents: 0
  });

  // Editorial action queue (this author's own drafts + scheduled items).
  const [editorial, setEditorial] = useState({ drafts: [], scheduled: [] });

  // Content Insights (view analytics) state.
  const [viewSummary, setViewSummary] = useState(null);
  const [popularType, setPopularType] = useState('news');
  const [popularItems, setPopularItems] = useState([]);
  const [popularLoading, setPopularLoading] = useState(false);

  const quickLinks = useMemo(
    () => [
      { to: '/admin/cms', label: t('openCms') },
      ...(canReviewScholarships
        ? [{ to: '/scholarship', label: t('reviewScholarships') }]
        : []),
      { to: '/announcements', label: t('previewAnnouncements') },
      { to: '/blogs', label: t('previewBlogs') },
      { to: '/gallery', label: t('previewGallery') }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, canReviewScholarships]
  );

  const cards = useMemo(
    () => [
      {
        title: t('draftPages'),
        value: metrics.draftPages,
        subtitle: t('draftPagesSub'),
        to: '/admin/cms?status=draft'
      },
      {
        title: t('draftNews'),
        value: metrics.draftNews,
        subtitle: t('draftNewsSub'),
        to: '/admin/cms?section=news&status=draft'
      },
      {
        title: t('draftBlogs'),
        value: metrics.draftBlogs,
        subtitle: t('draftBlogsSub'),
        to: '/admin/cms?section=blogs&status=draft'
      },
      {
        title: t('draftGalleries'),
        value: metrics.draftGalleries,
        subtitle: t('draftGalleriesSub'),
        to: '/admin/cms?section=gallery&status=draft'
      },
      {
        title: t('publishedAnnouncements'),
        value: metrics.publishedAnnouncements,
        subtitle: t('publishedAnnouncementsSub'),
        to: '/announcements'
      },
      {
        title: t('publishedEvents'),
        value: metrics.publishedEvents,
        subtitle: t('publishedEventsSub'),
        to: '/events'
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metrics, language]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [
        draftPagesResponse,
        draftNewsResponse,
        draftBlogsResponse,
        draftGalleriesResponse,
        announcementsResponse,
        eventsResponse,
        summaryResponse,
        editorialResponse
      ] = await Promise.all([
        cmsApi.listManagePages({ status: 'draft', page: 1, limit: 1 }),
        cmsApi.listManageNews({ status: 'draft', page: 1, limit: 1 }),
        cmsApi.listManageBlogs({ status: 'draft', page: 1, limit: 1 }),
        cmsApi.listManageGalleries({ status: 'draft', page: 1, limit: 1 }),
        cmsApi.listManageNews({ status: 'published', category: 'announcement', page: 1, limit: 1 }),
        eventApi.listEvents({ status: 'published', page: 1, limit: 1 }),
        // View analytics are optional decoration — never fail the dashboard over them.
        analyticsApi.getSummary().catch(() => ({ data: null })),
        // Author-scoped editorial queue; degrade gracefully if it errors.
        cmsApi.getEditorialQueue().catch(() => ({ data: { drafts: [], scheduled: [] } }))
      ]);

      setMetrics({
        draftPages: draftPagesResponse.data.total || 0,
        draftNews: draftNewsResponse.data.total || 0,
        draftBlogs: draftBlogsResponse.data.total || 0,
        draftGalleries: draftGalleriesResponse.data.total || 0,
        publishedAnnouncements: announcementsResponse.data.total || 0,
        publishedEvents: eventsResponse.data.total || 0
      });
      setViewSummary(summaryResponse.data);
      setEditorial({
        drafts: editorialResponse.data.drafts || [],
        scheduled: editorialResponse.data.scheduled || []
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgLoadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPopular = useCallback(async () => {
    setPopularLoading(true);

    try {
      const response = await analyticsApi.getPopularContent(popularType, { limit: 5 });
      setPopularItems(response.data.popular || []);
    } catch {
      // Analytics are decorative here; an empty list reads as "no views yet".
      setPopularItems([]);
    } finally {
      setPopularLoading(false);
    }
  }, [popularType]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadPopular();
  }, [loadPopular]);

  const editorialKindLabel = (kind) => {
    const map = { page: 'kindPage', news: 'kindNews', blog: 'kindBlog', gallery: 'kindGallery' };
    return map[kind] ? t(map[kind]) : kind;
  };

  const activePopularType = POPULAR_TYPES.find((type) => type.key === popularType);
  const maxTypeViews = viewSummary
    ? Math.max(1, ...VIEW_SUMMARY_META.map((meta) => viewSummary.byType?.[meta.key] || 0))
    : 1;

  return (
    <section>
      <div className="section-head">
        <h1>{t('title')}</h1>
        <button type="button" className="btn btn-ghost" onClick={loadDashboard}>
          {t('refresh')}
        </button>
      </div>

      <p className="meta">{t('lead')}</p>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>{t('loading')}</p>}

      <div className="feature-grid">
        {cards.map((card) => (
          <Link key={card.title} to={card.to} className="feature-card feature-card--link">
            <p className="meta">{card.title}</p>
            <h2>{card.value}</h2>
            <p>{card.subtitle}</p>
          </Link>
        ))}
      </div>

      <div className="insight-grid">
        <article className="surface-card insight-card">
          <div className="section-head section-head-tight">
            <h3>{t('contentViews')}</h3>
            <span className="meta">
              {viewSummary ? `${viewSummary.totalViews} ${t('total')}` : '—'}
            </span>
          </div>

          {!viewSummary && <p>{t('analyticsUnavailable')}</p>}

          {viewSummary && viewSummary.totalViews === 0 && <p>{t('noViewsRecorded')}</p>}

          {viewSummary && viewSummary.totalViews > 0 && (
            <div className="status-bars">
              {VIEW_SUMMARY_META.map((meta) => {
                const count = viewSummary.byType?.[meta.key] || 0;
                const pct = Math.round((count / maxTypeViews) * 100);
                return (
                  <div key={meta.key} className="status-bar-row">
                    <span className="status-bar-label">{toLocalizedText(meta.label, language)}</span>
                    <span className="status-bar-track">
                      <span className="status-bar-fill status-bar--views" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="status-bar-value">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="surface-card insight-card">
          <div className="section-head section-head-tight">
            <h3>{t('mostViewed')}</h3>
            <div className="action-row-tight">
              {POPULAR_TYPES.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  className={`btn btn-sm ${popularType === type.key ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setPopularType(type.key)}
                >
                  {toLocalizedText(type.label, language)}
                </button>
              ))}
            </div>
          </div>

          {popularLoading && <p>{t('loadingAnalytics')}</p>}

          {!popularLoading && !popularItems.length && (
            <p>
              {t('noViewsForType')} {toLocalizedText(activePopularType?.label, language)} {t('yet')}
            </p>
          )}

          {!popularLoading && !!popularItems.length && (
            <ul className="deadline-list">
              {popularItems.map((item) => (
                <li key={item.entityId} className="deadline-item">
                  <div className="deadline-item__info">
                    <Link
                      to={activePopularType.publicPath(item)}
                      className="deadline-item__title"
                    >
                      {toLocalizedText(item.title, language) || t('untitled')}
                    </Link>
                    <span className="meta">
                      {item.status}
                      {item.uniqueViewers ? ` • ${item.uniqueViewers} ${t('signedInViewers')}` : ''}
                    </span>
                  </div>
                  <span className="deadline-chip deadline-chip--normal">
                    {item.viewCount} {item.viewCount === 1 ? t('viewWord') : t('viewsWord')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="surface-card">
        <h3>{t('editorialQueue')}</h3>
        <div className="insight-grid">
          <div>
            <div className="section-head section-head-tight">
              <h4>{t('myDrafts')}</h4>
              <span className="meta">{editorial.drafts.length}</span>
            </div>
            {!editorial.drafts.length && <p>{t('noDrafts')}</p>}
            {!!editorial.drafts.length && (
              <ul className="deadline-list">
                {editorial.drafts.map((doc) => (
                  <li key={`${doc.kind}-${doc.id}`} className="deadline-item">
                    <div className="deadline-item__info">
                      <span className="deadline-item__title">
                        {toLocalizedText(doc.title, language) || t('untitled')}
                      </span>
                      <span className="meta">{editorialKindLabel(doc.kind)}</span>
                    </div>
                    <Link to={doc.actionPath} className="btn btn-sm btn-ghost">
                      {t('editLabel')}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="section-head section-head-tight">
              <h4>{t('scheduledPublishes')}</h4>
              <span className="meta">{editorial.scheduled.length}</span>
            </div>
            {!editorial.scheduled.length && <p>{t('noScheduled')}</p>}
            {!!editorial.scheduled.length && (
              <ul className="deadline-list">
                {editorial.scheduled.map((doc) => (
                  <li key={`${doc.kind}-${doc.id}`} className="deadline-item">
                    <div className="deadline-item__info">
                      <span className="deadline-item__title">
                        {toLocalizedText(doc.title, language) || t('untitled')}
                      </span>
                      <span className="meta">
                        {editorialKindLabel(doc.kind)} • {t('goesLive')} {toLocalDateTime(doc.scheduledAt)}
                      </span>
                    </div>
                    <Link to={doc.actionPath} className="btn btn-sm btn-ghost">
                      {t('editLabel')}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </article>

      <article className="surface-card">
        <h3>{t('quickActions')}</h3>
        <div className="action-row">
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to} className="btn btn-primary">
              {link.label}
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
}

export default TeacherDashboardPage;
