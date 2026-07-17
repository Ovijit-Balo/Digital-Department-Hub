import { useEffect, useState } from 'react';
import Modal from './Modal';

/**
 * Reusable confirmation dialog built on the shared Modal shell.
 * Use for destructive/irreversible actions (delete, discard, etc.).
 *
 * Optional note input: pass `noteLabel` to render a textarea; the typed note
 * is passed to `onConfirm(note)`. Replaces window.prompt-style flows.
 */
function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  noteLabel = '',
  notePlaceholder = ''
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNote('');
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="confirm-dialog">
        {message ? <p className="confirm-dialog__message">{message}</p> : null}
        {noteLabel ? (
          <label className="confirm-dialog__note">
            {noteLabel}
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={notePlaceholder}
              maxLength={500}
            />
          </label>
        ) : null}
        <div className="modal-form__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => onConfirm(note.trim())}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
