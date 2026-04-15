function AdminPanelPage() {
  const cards = [
    { title: 'Content Pipeline', value: '14', subtitle: 'Draft pages/news pending review' },
    { title: 'Scholarship Reviews', value: '36', subtitle: 'Applications awaiting decision' },
    { title: 'Event Registrations', value: '289', subtitle: 'Across active published events' },
    { title: 'Booking Requests', value: '7', subtitle: 'Pending venue approvals' },
    { title: 'Notification Queue', value: '19', subtitle: 'Queued delivery jobs' },
    { title: 'Audit Entries', value: '1,242', subtitle: 'Tracked actions this month' }
  ];

  return (
    <section>
      <div className="section-head">
        <h1>Admin Panel</h1>
        <button className="btn btn-primary">Trigger Weekly Digest</button>
      </div>

      <div className="feature-grid">
        {cards.map((card) => (
          <article key={card.title} className="feature-card">
            <p className="meta">{card.title}</p>
            <h2>{card.value}</h2>
            <p>{card.subtitle}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminPanelPage;
