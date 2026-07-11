const trimTrailingSlash = (value) => value.replace(/\/$/, '');

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_URL || '/api');

export const API_SERVER_URL = (() => {
  const explicit = import.meta.env.VITE_API_URL;
  if (!explicit) {
    return import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;
  }

  const trimmed = trimTrailingSlash(explicit);
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
})();

export const SOCKET_URL = trimTrailingSlash(import.meta.env.VITE_SOCKET_URL || API_SERVER_URL);
