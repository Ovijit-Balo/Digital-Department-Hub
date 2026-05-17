import SkeletonCard from './SkeletonCard';

export function SkeletonList({ count = 3, showMedia = false, lines = 3 }) {
  return (
    <div className="stack-list">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} showMedia={showMedia} lines={lines} />
      ))}
    </div>
  );
}

export default SkeletonList;
