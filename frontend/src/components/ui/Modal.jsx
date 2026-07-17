import { useEffect, useId } from 'react';

/**
 * Reusable modal dialog shell used for all pop-up forms across the app.
 *
 * Renders a backdrop + centered card with a titled header and a scrollable
 * body. Handles Escape-to-close, backdrop-click-to-close, and body scroll lock.
 * Pass the form (or any content) as children; for form modals use a
 * `<form className="modal-form form-grid">` and a `.modal-form__actions` row.
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {React.ReactNode} title
 * @param {'sm'|'md'|'lg'} [size]
 * @param {React.ReactNode} children
 */
function Modal({ isOpen, onClose, title, size = 'md', children }) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal-content modal-content--${size}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
