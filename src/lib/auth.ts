export const AUTH_TOKEN_KEY = "worko_admin_token";

export const getAuthToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (stored) {
    return stored;
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_TOKEN_KEY}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
};

export const setAuthToken = (token: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  document.cookie = `${AUTH_TOKEN_KEY}=${encodeURIComponent(
    token
  )}; path=/; max-age=2592000; samesite=lax`;
};

export const clearAuthToken = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
};
