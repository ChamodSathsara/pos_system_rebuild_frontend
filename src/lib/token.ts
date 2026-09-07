import { jwtDecode } from "jwt-decode";

// Only the short-lived access token and displayable user details are persisted.
// The refresh token is owned by the backend in an HttpOnly cookie.

const ACCESS_TOKEN_KEY = "pos_access_token";
const USER_KEY = "pos_current_user";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function hasValidAccessToken(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return typeof exp === "number" && exp * 1000 > Date.now() + 10_000;
  } catch {
    return false;
  }
}

export function getStoredUser<T>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUser(user: unknown) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  // Remove values left by versions that predated HttpOnly refresh cookies.
  window.localStorage.removeItem("pos_refresh_token");
  window.localStorage.removeItem(USER_KEY);
}
