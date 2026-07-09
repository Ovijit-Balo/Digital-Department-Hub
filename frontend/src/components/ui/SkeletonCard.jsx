export function SkeletonCard({ lines = 3, showMedia = false }) {
  return (
    <article className="surface-card">
      {showMedia && <div style={{ marginBottom: '0.6rem' }} className="skeleton skeleton-media" />}

      <div
        style={{ marginBottom: '0.5rem' }}
        className="skeleton skeleton-line skeleton-line--lg"
      />

      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ marginBottom: '0.5rem' }} className="skeleton skeleton-line" />
      ))}
    </article>
  );
}

export default SkeletonCard;
