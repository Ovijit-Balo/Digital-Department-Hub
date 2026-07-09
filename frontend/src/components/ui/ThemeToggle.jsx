import { useThemeContext } from '../../context/ThemeContext';

function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useThemeContext();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="theme-toggle"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--stroke)',
        borderRadius: '8px',
        padding: '8px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: 'var(--text)',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.target.style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        e.target.style.borderColor = 'var(--stroke)';
      }}
    >
      {isDark ? (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          <span>Light</span>
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span>Dark</span>
        </>
      )}
    </button>
  );
}

export default ThemeToggle;
