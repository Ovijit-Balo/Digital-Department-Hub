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

      <div className="pagination-pages" role="list" aria-label="Pages">
        {Array.from({ length: totalPages }, (_, index) => index + 1)
          .filter((item) => item === 1 || item === totalPages || Math.abs(item - safePage) <= 1)
          .reduce((pages, item, index, array) => {
            if (index > 0 && item - array[index - 1] > 1) {
              pages.push('gap');
            }
            pages.push(item);
            return pages;
          }, [])
          .map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="pagination-gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`pagination-page${item === safePage ? ' is-active' : ''}`}
                disabled={disabled || item === safePage}
                onClick={() => onPageChange(item)}
                aria-current={item === safePage ? 'page' : undefined}
              >
                {item}
              </button>
            )
          )}
      </div>

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
