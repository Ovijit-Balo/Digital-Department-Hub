import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cmsApi, eventApi } from '../../api/modules';
import { getApiErrorMessage } from '../../utils/http';

function TeacherDashboardPage() {
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

  const quickLinks = useMemo(
    () => [
      { to: '/admin/cms', label: 'Open CMS Studio' },
      { to: '/announcements', label: 'Preview Announcements' },
      { to: '/blogs', label: 'Preview Blogs' },
      { to: '/gallery', label: 'Preview Gallery' }
    ],
    []
  );

  const cards = useMemo(
    () => [
      {
        title: 'Draft Pages',
        value: metrics.draftPages,
        subtitle: 'Department pages waiting for publication'
      },
      {
        title: 'Draft News',
        value: metrics.draftNews,
        subtitle: 'News items prepared by the editorial team'
      },
      {
        title: 'Draft Blogs',
        value: metrics.draftBlogs,
        subtitle: 'Blog posts pending final review'
      },
      {
        title: 'Draft Galleries',
        value: metrics.draftGalleries,
        subtitle: 'Gallery collections awaiting release'
      },
      {
        title: 'Published Announcements',
        value: metrics.publishedAnnouncements,
        subtitle: 'Announcements visible to students'
      },
      {
        title: 'Published Events',
        value: metrics.publishedEvents,
        subtitle: 'Events currently open to the public'
      }
    ],
    [metrics]
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
        eventsResponse
      ] = await Promise.all([
        cmsApi.listManagePages({ status: 'draft', page: 1, limit: 1 }),
        cmsApi.listManageNews({ status: 'draft', page: 1, limit: 1 }),
        cmsApi.listManageBlogs({ status: 'draft', page: 1, limit: 1 }),
        cmsApi.listManageGalleries({ status: 'draft', page: 1, limit: 1 }),
        cmsApi.listManageNews({ status: 'published', category: 'announcement', page: 1, limit: 1 }),
        eventApi.listEvents({ status: 'published', page: 1, limit: 1 })
      ]);

      setMetrics({
        draftPages: draftPagesResponse.data.total || 0,
        draftNews: draftNewsResponse.data.total || 0,
        draftBlogs: draftBlogsResponse.data.total || 0,
        draftGalleries: draftGalleriesResponse.data.total || 0,
        publishedAnnouncements: announcementsResponse.data.total || 0,
        publishedEvents: eventsResponse.data.total || 0
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load teacher dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <section>
      <div className="section-head">
        <h1>Teacher Dashboard</h1>
        <button type="button" className="btn btn-ghost" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      <p className="meta">
        Editorial workspace for classroom-facing content, departmental announcements, and publication readiness.
      </p>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading teacher workspace...</p>}

      <div className="feature-grid">
        {cards.map((card) => (
          <article key={card.title} className="feature-card">
            <p className="meta">{card.title}</p>
            <h2>{card.value}</h2>
            <p>{card.subtitle}</p>
          </article>
        ))}
      </div>

      <article className="surface-card">
        <h3>Teacher Quick Actions</h3>
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
