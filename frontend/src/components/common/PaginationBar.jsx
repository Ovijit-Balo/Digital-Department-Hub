import { ui } from '../../i18n/publicUi';

export default function PaginationBar({ language, page, total, limit, onPageChange, disabled }) {
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / Number(limit || 1)));
  const safePage = Math.min(Math.max(1, page), totalPages);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination-bar" aria-label="Pagination">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={disabled || safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        {ui('newsroom', 'prev', language)}
      </button>
      <span className="pagination-meta">
        {ui('newsroom', 'pageOf', language)} {safePage} {ui('newsroom', 'of', language)} {totalPages}
      </span>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={disabled || safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
      >
        {ui('newsroom', 'next', language)}
      </button>
    </nav>
  );
}
