export function InlineAlert({ type = 'info', title, children }) {
  return (
    <div
      className={`inline-alert inline-alert--${type}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      {title && <strong className="inline-alert__title">{title}</strong>}
      <span className={type === 'error' ? 'error-text' : 'meta'}>{children}</span>
    </div>
  );
}

export default InlineAlert;
