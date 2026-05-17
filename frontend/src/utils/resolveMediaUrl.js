const defaultApiBase = '/api/v1';

function getApiOrigin() {
  const base = (import.meta.env.VITE_API_URL || defaultApiBase).trim();

  if (base.startsWith('/')) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  try {
    return new URL(base).origin;
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
}

/**
 * Turn relative upload paths from the API into absolute URLs the browser can load.
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  const origin = getApiOrigin();
  if (trimmed.startsWith('/')) {
    return origin ? `${origin}${trimmed}` : trimmed;
  }

  return origin ? `${origin}/${trimmed.replace(/^\.\//, '')}` : trimmed;
}
