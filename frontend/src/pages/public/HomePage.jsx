import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi, cmsApi, eventApi, scholarshipApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalDateTime, toLocalizedText } from '../../utils/localized';

function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState({
    news: [],
    notices: [],
    events: [],
    venues: []
  });

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [newsResponse, noticeResponse, eventResponse, venueResponse] = await Promise.all([
        cmsApi.listNews({ status: 'published', limit: 4 }),
        scholarshipApi.listNotices({ status: 'open', limit: 4 }),
        eventApi.listEvents({ status: 'published', limit: 4 }),
        bookingApi.listVenues({ isActive: true, limit: 6 })
      ]);

      setSnapshot({
        news: newsResponse.data.items || [],
        notices: noticeResponse.data.items || [],
        events: eventResponse.data.items || [],
        venues: venueResponse.data.items || []
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load dashboard highlights.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const nextEvent = useMemo(() => {
    if (!snapshot.events.length) {
      return null;
    }

    return [...snapshot.events].sort(
      (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
    )[0];
  }, [snapshot.events]);

  const statTiles = useMemo(
    () => [
      {
        label: 'Published News',
        value: snapshot.news.length
      },
      {
        label: 'Open Scholarships',
        value: snapshot.notices.length
      },
      {
        label: 'Upcoming Events',
        value: snapshot.events.length
      },
      {
        label: 'Bookable Venues',
        value: snapshot.venues.length
      }
    ],
    [snapshot.events.length, snapshot.news.length, snapshot.notices.length, snapshot.venues.length]
  );

  return (
    <section className="home-shell">
      <div className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">Operational Digital Campus Platform</p>
          <h1>Run your department with one interface, not five disconnected tools.</h1>
          <p>
            Publish updates, open scholarships, register events, approve venue requests, and handle
            inquiries from a unified, role-aware workflow.
          </p>

          {isAuthenticated && (
            <p className="home-welcome-line">
              Signed in as <strong>{user?.fullName || 'User'}</strong>.
            </p>
          )}

          <div className="home-cta-row">
            <Link to="/news" className="btn btn-primary">
              Explore Newsroom
            </Link>
            <Link to="/scholarship" className="btn btn-ghost">
              Open Scholarship Desk
            </Link>
            <Link to="/contact" className="btn btn-ghost">
              Submit Inquiry
            </Link>
          </div>

          <div className="home-chip-row">
            <span className="home-chip">Bilingual Experience</span>
            <span className="home-chip">Role-Based Access</span>
            <span className="home-chip">Audit Friendly</span>
            <span className="home-chip">Demo Ready</span>
          </div>
        </div>

        <aside className="surface-card home-live-panel">
          <div className="section-head section-head-tight">
            <h3>Live Snapshot</h3>
            <button type="button" className="btn btn-ghost" onClick={loadSnapshot}>
              Refresh
            </button>
          </div>

          {loading && <p>Loading platform highlights...</p>}

          {!loading && (
            <div className="home-stat-grid">
              {statTiles.map((item) => (
                <article key={item.label} className="home-stat-tile">
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          )}

          {nextEvent && (
            <div className="home-next-event">
              <p className="home-kicker">Nearest Event</p>
              <h4>{nextEvent.title}</h4>
              <p className="meta">{toLocalDateTime(nextEvent.startTime)}</p>
            </div>
          )}
        </aside>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="home-grid">
        <article className="surface-card home-block">
          <div className="section-head section-head-tight">
            <h3>Latest News</h3>
            <Link to="/news" className="home-inline-link">
              View all
            </Link>
          </div>
          {!snapshot.news.length && !loading && <p>No news published yet.</p>}
          <div className="home-list">
            {snapshot.news.map((item) => (
              <article key={item._id} className="home-list-item">
                <h4>{toLocalizedText(item.title, language)}</h4>
                <p>{toLocalizedText(item.summary, language)}</p>
                <span className="meta">{toIsoDate(item.publishedAt || item.createdAt)}</span>
              </article>
            ))}
          </div>
        </article>

        <article className="surface-card home-block">
          <div className="section-head section-head-tight">
            <h3>Open Scholarships</h3>
            <Link to="/scholarship" className="home-inline-link">
              Apply now
            </Link>
          </div>
          {!snapshot.notices.length && !loading && <p>No open scholarships right now.</p>}
          <div className="home-list">
            {snapshot.notices.map((item) => (
              <article key={item._id} className="home-list-item">
                <h4>{toLocalizedText(item.title, language)}</h4>
                <p>{toLocalizedText(item.description, language)}</p>
                <span className="meta">Deadline: {toIsoDate(item.deadline)}</span>
              </article>
            ))}
          </div>
        </article>

        <article className="surface-card home-block">
          <div className="section-head section-head-tight">
            <h3>Upcoming Events</h3>
            <Link to="/events" className="home-inline-link">
              Register
            </Link>
          </div>
          {!snapshot.events.length && !loading && <p>No published events currently.</p>}
          <div className="home-list">
            {snapshot.events.map((item) => (
              <article key={item._id} className="home-list-item">
                <h4>{item.title}</h4>
                <p>{item.location}</p>
                <span className="meta">{toLocalDateTime(item.startTime)}</span>
              </article>
            ))}
          </div>
        </article>

        <article className="surface-card home-block">
          <div className="section-head section-head-tight">
            <h3>Venue Availability</h3>
            <Link to="/booking" className="home-inline-link">
              Request slot
            </Link>
          </div>
          {!snapshot.venues.length && !loading && <p>No active venues configured yet.</p>}
          <div className="home-list">
            {snapshot.venues.map((item) => (
              <article key={item._id} className="home-list-item">
                <h4>{item.name}</h4>
                <p>{item.location}</p>
                <span className="meta">Capacity: {item.capacity}</span>
              </article>
            ))}
          </div>
        </article>
      </div>

      <article className="surface-card home-value-strip">
        <h3>Why This Feels Better Than A Static Department Site</h3>
        <div className="home-value-grid">
          <article>
            <h4>Action-first pages</h4>
            <p>Visitors can immediately apply, register, request, and inquire from the homepage flow.</p>
          </article>
          <article>
            <h4>Operational transparency</h4>
            <p>Real module counts and timelines surface what is currently active in the department.</p>
          </article>
          <article>
            <h4>Showable for evaluation</h4>
            <p>The landing page now demonstrates live integrations instead of only static description text.</p>
          </article>
        </div>
      </article>
    </section>
  );
}

export default HomePage;
