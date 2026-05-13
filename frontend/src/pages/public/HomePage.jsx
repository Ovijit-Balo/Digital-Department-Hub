import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi, cmsApi, eventApi, scholarshipApi } from '../../api/modules';
import { PUBLIC_NAV_CONTENT, PUBLIC_NAV_SERVICES } from '../../constants/publicNav';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
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
        labelKey: 'statNews',
        value: snapshot.news.length
      },
      {
        labelKey: 'statScholarships',
        value: snapshot.notices.length
      },
      {
        labelKey: 'statEvents',
        value: snapshot.events.length
      },
      {
        labelKey: 'statVenues',
        value: snapshot.venues.length
      }
    ],
    [snapshot.events.length, snapshot.news.length, snapshot.notices.length, snapshot.venues.length]
  );

  return (
    <section className="home-shell">
      <div className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">{ui('home', 'eyebrow', language)}</p>
          <h1>{ui('home', 'heroTitle', language)}</h1>
          <p>{ui('home', 'heroLead', language)}</p>

          {isAuthenticated && (
            <p className="home-welcome-line">
              {ui('home', 'signedInAs', language)} <strong>{user?.fullName || 'User'}</strong>.
            </p>
          )}

          <div className="home-cta-row">
            <Link to="/news" className="btn btn-primary">
              {ui('home', 'exploreNewsroom', language)}
            </Link>
            <Link to="/scholarship" className="btn btn-ghost">
              {ui('home', 'openScholarshipDesk', language)}
            </Link>
            <Link to="/contact" className="btn btn-ghost">
              {ui('home', 'submitInquiry', language)}
            </Link>
          </div>

          <div className="home-chip-row">
            <span className="home-chip">{ui('home', 'chipBilingual', language)}</span>
            <span className="home-chip">{ui('home', 'chipRole', language)}</span>
            <span className="home-chip">{ui('home', 'chipAudit', language)}</span>
            <span className="home-chip">{ui('home', 'chipDemo', language)}</span>
          </div>
        </div>

        <aside className="surface-card home-live-panel">
          <div className="section-head section-head-tight">
            <h3>{ui('home', 'liveSnapshot', language)}</h3>
            <button type="button" className="btn btn-ghost" onClick={loadSnapshot}>
              {ui('home', 'refresh', language)}
            </button>
          </div>

          {loading && <p>{ui('home', 'loadingHighlights', language)}</p>}

          {!loading && (
            <div className="home-stat-grid">
              {statTiles.map((item) => (
                <article key={item.labelKey} className="home-stat-tile">
                  <p>{ui('home', item.labelKey, language)}</p>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          )}

          {nextEvent && (
            <div className="home-next-event">
              <p className="home-kicker">{ui('home', 'nearestEvent', language)}</p>
              <h4>{nextEvent.title}</h4>
              <p className="meta">{toLocalDateTime(nextEvent.startTime)}</p>
            </div>
          )}
        </aside>
      </div>

      <section className="surface-card home-explore" aria-labelledby="home-explore-heading">
        <h2 id="home-explore-heading" className="home-explore-heading">
          {ui('home', 'exploreHubTitle', language)}
        </h2>
        <p className="home-explore-lead">{ui('home', 'exploreHubSubtitle', language)}</p>
        <div className="home-explore-columns">
          <div className="home-explore-column">
            <h3 className="home-explore-col-title">{ui('home', 'exploreColContent', language)}</h3>
            <ul className="home-explore-list">
              {PUBLIC_NAV_CONTENT.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="home-explore-link">
                    {toLocalizedText(item.label, language)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="home-explore-column">
            <h3 className="home-explore-col-title">{ui('home', 'exploreColServices', language)}</h3>
            <ul className="home-explore-list">
              {PUBLIC_NAV_SERVICES.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="home-explore-link">
                    {toLocalizedText(item.label, language)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="home-explore-column">
            <h3 className="home-explore-col-title">{ui('home', 'exploreColConnect', language)}</h3>
            <ul className="home-explore-list">
              <li>
                <Link to="/contact" className="home-explore-link">
                  {ui('nav', 'contact', language)}
                </Link>
              </li>
              <li>
                <Link to="/portals" className="home-explore-link">
                  {ui('nav', 'portals', language)}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {error && <p className="error-text">{error}</p>}

      <div className="home-grid">
        <article className="surface-card home-block">
          <div className="section-head section-head-tight">
            <h3>{ui('home', 'latestNews', language)}</h3>
            <Link to="/news" className="home-inline-link">
              {ui('home', 'viewAll', language)}
            </Link>
          </div>
          {!snapshot.news.length && !loading && <p>{ui('home', 'noNews', language)}</p>}
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
            <h3>{ui('home', 'scholarshipBlockTitle', language)}</h3>
            <Link to="/scholarship" className="home-inline-link">
              {ui('home', 'applyNow', language)}
            </Link>
          </div>
          {!snapshot.notices.length && !loading && <p>{ui('home', 'noScholarships', language)}</p>}
          <div className="home-list">
            {snapshot.notices.map((item) => (
              <article key={item._id} className="home-list-item">
                <h4>{toLocalizedText(item.title, language)}</h4>
                <p>{toLocalizedText(item.description, language)}</p>
                <span className="meta">
                  {ui('home', 'deadline', language)}: {toIsoDate(item.deadline)}
                </span>
              </article>
            ))}
          </div>
        </article>

        <article className="surface-card home-block">
          <div className="section-head section-head-tight">
            <h3>{ui('home', 'upcomingEvents', language)}</h3>
            <Link to="/events" className="home-inline-link">
              {ui('home', 'register', language)}
            </Link>
          </div>
          {!snapshot.events.length && !loading && <p>{ui('home', 'noEvents', language)}</p>}
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
            <h3>{ui('home', 'venueAvailability', language)}</h3>
            <Link to="/booking" className="home-inline-link">
              {ui('home', 'requestSlot', language)}
            </Link>
          </div>
          {!snapshot.venues.length && !loading && <p>{ui('home', 'noVenues', language)}</p>}
          <div className="home-list">
            {snapshot.venues.map((item) => (
              <article key={item._id} className="home-list-item">
                <h4>{item.name}</h4>
                <p>{item.location}</p>
                <span className="meta">
                  {ui('home', 'capacity', language)}: {item.capacity}
                </span>
              </article>
            ))}
          </div>
        </article>
      </div>

      <article className="surface-card home-value-strip">
        <h3>{ui('home', 'valueStripTitle', language)}</h3>
        <div className="home-value-grid">
          <article>
            <h4>{ui('home', 'value1h', language)}</h4>
            <p>{ui('home', 'value1p', language)}</p>
          </article>
          <article>
            <h4>{ui('home', 'value2h', language)}</h4>
            <p>{ui('home', 'value2p', language)}</p>
          </article>
          <article>
            <h4>{ui('home', 'value3h', language)}</h4>
            <p>{ui('home', 'value3p', language)}</p>
          </article>
        </div>
      </article>
    </section>
  );
}

export default HomePage;
