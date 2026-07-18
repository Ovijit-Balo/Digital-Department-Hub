import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LazyMotion,
  MotionConfig,
  animate,
  domAnimation,
  m,
  useInView,
  useReducedMotion
} from 'framer-motion';
import { bookingApi, cmsApi, eventApi, scholarshipApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import { getDefaultWorkspaceForUser } from '../../constants/roles';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { toIsoDate, toLocalDateTime, toLocalizedText } from '../../utils/localized';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } }
};

const inViewProps = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, margin: '-60px' }
};

const NEWS_CATEGORY_LABELS = {
  news: { en: 'News', bn: 'সংবাদ' },
  announcement: { en: 'Announcement', bn: 'ঘোষণা' }
};

// Shown when a news post has no cover image of its own. Drop a file at
// frontend/public/images/news-default.jpg to use it; if it's missing, the card
// falls back to its cardinal gradient.
const NEWS_FALLBACK_IMAGE = '/images/news-default.jpeg';

const STAT_ICONS = {
  statNews: (
    <path d="M5 5h11a2 2 0 0 1 2 2v10a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2V5Zm3 4h7M8 12h7m-7 3h4" />
  ),
  statScholarships: (
    <path d="M12 4 3 8.5 12 13l9-4.5L12 4Zm-5 6.7V15c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4.3M21 8.5V14" />
  ),
  statEvents: (
    <path d="M6 4v3m12-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm3 8h3v3H8v-3Z" />
  ),
  statVenues: (
    <path d="M4 20V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v14M4 20h16M15 9h4a1 1 0 0 1 1 1v10M7.5 9h2m-2 3.5h2M7.5 16h2" />
  )
};

/** Animated count-up that respects prefers-reduced-motion. */
function StatCounter({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduceMotion) {
      setDisplay(value);
      return undefined;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(Math.round(latest))
    });
    return () => controls.stop();
  }, [inView, value, reduceMotion]);

  return <strong ref={ref}>{display}</strong>;
}

function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const workspacePath = getDefaultWorkspaceForUser(user);

  // Optional hero background video. Set VITE_HERO_VIDEO_URL to an mp4 URL to
  // enable it; when unset the hero uses its built-in animated backdrop.
  const heroVideoUrl = import.meta.env.VITE_HERO_VIDEO_URL || '';
  const heroVideoRef = useRef(null);
  const [heroPaused, setHeroPaused] = useState(false);

  const toggleHeroVideo = () => {
    const video = heroVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setHeroPaused(false);
    } else {
      video.pause();
      setHeroPaused(true);
    }
  };

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
      setError(getApiErrorMessage(apiError, toLocalizedText(
        { en: 'Failed to load dashboard highlights.', bn: 'ড্যাশবোর্ড হাইলাইট লোড করতে ব্যর্থ।' },
        language
      )));
    } finally {
      setLoading(false);
    }
  }, [language]);

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
      { labelKey: 'statNews', value: snapshot.news.length },
      { labelKey: 'statScholarships', value: snapshot.notices.length },
      { labelKey: 'statEvents', value: snapshot.events.length },
      { labelKey: 'statVenues', value: snapshot.venues.length }
    ],
    [snapshot.events.length, snapshot.news.length, snapshot.notices.length, snapshot.venues.length]
  );

  // To use real photos, drop image files into frontend/public/images/ and set
  // `img` below (e.g. img: '/images/feature-scholarship.jpg'). If the file is
  // missing or fails to load, the card falls back to its gradient art.
  const featureCards = [
    {
      to: '/scholarship',
      cat: 'featCatScholarships',
      t: 'qa1t',
      p: 'qa1p',
      art: 1,
      img: '/images/feature-scholarship.jpg'
    },
    {
      to: '/events',
      cat: 'featCatEvents',
      t: 'qa2t',
      p: 'qa2p',
      art: 2,
      img: '/images/feature-event.jpeg'
    },
    {
      to: '/booking',
      cat: 'featCatFacilities',
      t: 'qa3t',
      p: 'qa3p',
      art: 3,
      img: '/images/feature-venue.avif'
    }
  ];

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
      <section className="home-shell home-premium">
        {/* ---- Hero: full viewport, centered, cinematic ---- */}
        <section className={`hero-cinema hero-cinema--full${heroVideoUrl ? ' hero-cinema--video' : ''}`}>
          {heroVideoUrl && (
            <video
              ref={heroVideoRef}
              className="hero-cinema__video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            >
              <source src={heroVideoUrl} type="video/mp4" />
            </video>
          )}
          <div className="hero-cinema__scrim" aria-hidden="true" />

          <m.div
            className="hero-cinema__inner hero-cinema__inner--center"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <m.p variants={fadeUp} className="hero-cinema__eyebrow">
              {ui('home', 'eyebrow', language)}
            </m.p>
            <m.h1 variants={fadeUp} className="hero-cinema__title">
              {ui('home', 'heroTitle', language)}
            </m.h1>
            <m.p variants={fadeUp} className="hero-cinema__lead">
              {ui('home', 'heroLead', language)}
            </m.p>

            {isAuthenticated && (
              <m.p variants={fadeUp} className="hero-cinema__welcome">
                {ui('home', 'signedInAs', language)} <strong>{user?.fullName || 'User'}</strong>.
              </m.p>
            )}

            <m.div variants={fadeUp} className="hero-cinema__cta">
              {isAuthenticated ? (
                <Link to={workspacePath} className="btn btn-primary">
                  {ui('home', 'heroCtaWorkspace', language)}
                </Link>
              ) : (
                <Link to="/register" className="btn btn-primary">
                  {ui('home', 'heroCtaAccount', language)}
                </Link>
              )}
              <Link to="/scholarship" className="btn btn-hero-outline">
                {ui('home', 'heroCtaScholarships', language)}
              </Link>
              <Link to="/events" className="btn btn-hero-outline">
                {ui('home', 'heroCtaEvents', language)}
              </Link>
            </m.div>
          </m.div>

          {heroVideoUrl && (
            <div className="hero-cinema__controls">
              <button
                type="button"
                className="hero-ctl"
                onClick={toggleHeroVideo}
                aria-label={heroPaused ? 'Play background video' : 'Pause background video'}
              >
                {heroPaused ? '►' : '❚❚'}
              </button>
            </div>
          )}
        </section>

        {/* ---- How the hub works: first-visit orientation ---- */}
        <section className="home-band home-band--white home-how" aria-labelledby="home-how-heading">
          <m.div className="home-band__inner" {...inViewProps} variants={stagger}>
            <m.h2 variants={fadeUp} id="home-how-heading" className="home-section-title">
              {ui('home', 'howHeading', language)}
            </m.h2>
            <m.p variants={fadeUp} className="home-how-lead">
              {ui('home', 'howLead', language)}
            </m.p>

            <div className="home-how-grid">
              {[1, 2, 3].map((step) => (
                <m.article key={step} variants={fadeUp} className="home-how-step">
                  <span className="home-how-step__num" aria-hidden="true">
                    {step}
                  </span>
                  <h3>{ui('home', `how${step}t`, language)}</h3>
                  <p>{ui('home', `how${step}p`, language)}</p>
                </m.article>
              ))}
            </div>

            <m.div variants={fadeUp} className="home-how-actions">
              {isAuthenticated ? (
                <Link to={workspacePath} className="btn btn-primary">
                  {ui('home', 'heroCtaWorkspace', language)}
                </Link>
              ) : (
                <Link to="/register" className="btn btn-primary">
                  {ui('home', 'howRegisterCta', language)}
                </Link>
              )}
              <Link to="/portals" className="btn btn-ghost">
                {ui('home', 'howPortalsCta', language)}
              </Link>
            </m.div>
          </m.div>
        </section>

        {/* ---- Feature cards ---- */}
        <m.section className="home-features" aria-labelledby="home-qa-heading" {...inViewProps} variants={stagger}>
          <m.h2 variants={fadeUp} id="home-qa-heading" className="home-section-title">
            {ui('home', 'qaHeading', language)}
          </m.h2>
          <div className="home-features-grid">
            {featureCards.map((card) => (
              <m.div key={card.to} variants={fadeUp}>
                <Link to={card.to} className="feature-card">
                  <div className={`feature-media feature-media--${card.art}`} aria-hidden="true">
                    <div className="feature-media__art" />
                    {card.img && (
                      <img
                        src={card.img}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="feature-media__img"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  <div className="feature-card__body">
                    <p className="feature-card__cat">{ui('home', card.cat, language)}</p>
                    <h3>{ui('home', card.t, language)}</h3>
                    <p className="feature-card__desc">{ui('home', card.p, language)}</p>
                    <span className="home-qa-arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
                </Link>
              </m.div>
            ))}
          </div>
        </m.section>

        {/* ---- News / updates: editorial two-column band ---- */}
        <section className="home-band home-band--gray home-news-band" aria-labelledby="home-news-heading">
          <div className="home-band__inner home-news-grid">
            <m.div className="home-news-intro" {...inViewProps} variants={fadeUp}>
              <h2 id="home-news-heading">{ui('home', 'latestNews', language)}</h2>
              <p>{ui('home', 'newsLead', language)}</p>
              <Link to="/news" className="btn btn-primary">
                {ui('home', 'viewAll', language)}
              </Link>
            </m.div>

            <m.div className="home-news-cards" {...inViewProps} variants={stagger}>
              {loading && <p>{ui('home', 'loadingHighlights', language)}</p>}
              {!loading && !snapshot.news.length && <p>{ui('home', 'noNews', language)}</p>}
              {snapshot.news.map((item) => {
                const cover = resolveMediaUrl(item.coverImageUrl) || NEWS_FALLBACK_IMAGE;
                return (
                  <m.article key={item._id} variants={fadeUp} className="news-card">
                    <div className="news-card__media" aria-hidden="true">
                      <span className="news-card__art" />
                      <img
                        src={cover}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="news-card__body">
                      <p className="news-card__cat">
                        {toLocalizedText(
                          NEWS_CATEGORY_LABELS[item.category] || NEWS_CATEGORY_LABELS.news,
                          language
                        )}
                        <span className="news-card__date"> · {toIsoDate(item.publishedAt || item.createdAt)}</span>
                      </p>
                      <h3>
                        <Link to={`/news/${item._id}`}>{toLocalizedText(item.title, language)}</Link>
                      </h3>
                      <p className="news-card__summary">{toLocalizedText(item.summary, language)}</p>
                      <Link to={`/news/${item._id}`} className="home-inline-link">
                        {ui('home', 'readMore', language)} →
                      </Link>
                    </div>
                  </m.article>
                );
              })}
            </m.div>
          </div>
        </section>

        {error && <p className="error-text">{error}</p>}

        {/* ---- Open scholarships / upcoming events / venues ---- */}
        <m.div className="home-grid home-grid--three" {...inViewProps} variants={stagger}>
          <m.article variants={fadeUp} className="surface-card home-block">
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
          </m.article>

          <m.article variants={fadeUp} className="surface-card home-block">
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
          </m.article>

          <m.article variants={fadeUp} className="surface-card home-block">
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
          </m.article>
        </m.div>

        {/* ---- About statement ---- */}
        <m.section className="home-about" aria-labelledby="home-about-heading" {...inViewProps} variants={fadeUp}>
          <p className="home-kicker">{ui('home', 'aboutKicker', language)}</p>
          <h2 id="home-about-heading" className="home-about-title">
            {ui('home', 'aboutTitle', language)}
          </h2>
          <p className="home-about-body">{ui('home', 'aboutBody', language)}</p>
          <Link to="/about" className="home-inline-link">
            {ui('home', 'aboutCta', language)} →
          </Link>
        </m.section>

        {/* ---- Statistics with animated counters ---- */}
        <section className="home-band home-band--white home-stats" aria-labelledby="home-glance-heading">
          <div className="home-band__inner">
            <div className="section-head section-head-tight">
              <h3 id="home-glance-heading" className="home-section-title">
                {ui('home', 'glanceTitle', language)}
              </h3>
              <button type="button" className="btn btn-ghost" onClick={loadSnapshot}>
                {ui('home', 'refresh', language)}
              </button>
            </div>

            {loading && <p>{ui('home', 'loadingHighlights', language)}</p>}

            {!loading && (
              <m.div className="home-stats-grid" {...inViewProps} variants={stagger}>
                {statTiles.map((item) => (
                  <m.article key={item.labelKey} variants={fadeUp} className="home-stat-tile home-stat-tile--counter">
                    <svg
                      className="home-stat-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      {STAT_ICONS[item.labelKey]}
                    </svg>
                    <StatCounter value={item.value} />
                    <p>{ui('home', item.labelKey, language)}</p>
                  </m.article>
                ))}
              </m.div>
            )}

            {nextEvent && (
              <div className="home-next-event">
                <p className="home-kicker">{ui('home', 'nearestEvent', language)}</p>
                <h4>{nextEvent.title}</h4>
                <p className="meta">{toLocalDateTime(nextEvent.startTime)}</p>
              </div>
            )}
          </div>
        </section>

        {/* ---- Full-width call to action ---- */}
        <section className="home-band home-cta-band">
          <m.div className="home-band__inner home-cta-inner" {...inViewProps} variants={stagger}>
            <m.h2 variants={fadeUp}>{ui('home', 'ctaTitle', language)}</m.h2>
            <m.p variants={fadeUp}>{ui('home', 'ctaLead', language)}</m.p>
            <m.div variants={fadeUp}>
              {isAuthenticated ? (
                <Link to="/scholarship" className="btn btn-primary home-cta-btn">
                  {ui('home', 'ctaButton', language)}
                </Link>
              ) : (
                <Link to="/register" className="btn btn-primary home-cta-btn">
                  {ui('home', 'ctaButtonGuest', language)}
                </Link>
              )}
            </m.div>
            {!isAuthenticated && (
              <m.p variants={fadeUp} className="home-cta-secondary">
                <Link to="/portals" className="home-inline-link home-inline-link--inverse">
                  {ui('home', 'ctaPortalLink', language)} →
                </Link>
              </m.p>
            )}
          </m.div>
        </section>
      </section>
      </MotionConfig>
    </LazyMotion>
  );
}

export default HomePage;
