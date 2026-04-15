function HomePage() {
  return (
    <section className="hero-surface">
      <div className="hero-content">
        <p className="eyebrow">Production-Grade Department Platform</p>
        <h1>One digital hub for content, scholarships, events, venues, and governance.</h1>
        <p>
          Digital Department Hub unifies all department workflows into a modular platform with RBAC,
          notifications, and audit trails designed for accountability.
        </p>
      </div>

      <div className="feature-grid">
        <article className="feature-card">
          <h3>Content Management</h3>
          <p>Publish bilingual pages, news, blogs, and galleries from a single editorial workflow.</p>
        </article>
        <article className="feature-card">
          <h3>Scholarship Operations</h3>
          <p>Run transparent scholarship cycles from notice publication to review and CSV export.</p>
        </article>
        <article className="feature-card">
          <h3>Events + QR Check-in</h3>
          <p>Capture registrations, generate unique QR codes, and streamline check-in at scale.</p>
        </article>
        <article className="feature-card">
          <h3>Venue Booking</h3>
          <p>Prevent schedule collisions with conflict detection and manager-level approvals.</p>
        </article>
      </div>
    </section>
  );
}

export default HomePage;
