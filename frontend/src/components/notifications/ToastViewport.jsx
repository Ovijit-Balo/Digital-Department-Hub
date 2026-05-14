import { useToast } from '../../context/ToastContext';

const toneLabels = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info'
};

export default function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast toast--${toast.tone}`} role="status">
          <div className="toast__copy">
            <p className="toast__eyebrow">{toneLabels[toast.tone] || toneLabels.info}</p>
            <h3 className="toast__title">{toast.title || toneLabels[toast.tone] || toneLabels.info}</h3>
            {toast.message && <p className="toast__message">{toast.message}</p>}
          </div>
          <button type="button" className="toast__close" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
            ×
          </button>
        </article>
      ))}
    </div>
  );
}