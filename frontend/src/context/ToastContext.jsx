import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((toastId) => {
    const timer = timersRef.current.get(toastId);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(toastId);
    }

    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const pushToast = useCallback(
    ({ title, message, tone = 'info', duration = 4500 }) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const nextToast = { id, title, message, tone };

      setToasts((current) => [nextToast, ...current].slice(0, 4));

      const timer = window.setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);

      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toasts,
      pushToast,
      dismiss,
      success: (message, options = {}) => pushToast({ tone: 'success', message, ...options }),
      error: (message, options = {}) => pushToast({ tone: 'error', message, ...options }),
      info: (message, options = {}) => pushToast({ tone: 'info', message, ...options }),
      warning: (message, options = {}) => pushToast({ tone: 'warning', message, ...options })
    }),
    [dismiss, pushToast, toasts]
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    },
    []
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}
