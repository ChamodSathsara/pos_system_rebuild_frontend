import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/env";
import { clearSession, getAccessToken, setAccessToken } from "@/lib/token";
import type { ApiResponse, RefreshResponse } from "@/types";
import { getUserFacingError } from "@/lib/errors";

export class ApiError extends Error {
  status?: number;
  errors?: unknown;

  constructor(message: string, status?: number, errors?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const AUTH_ROUTES = ["/api/auth/login", "/api/auth/refresh", "/api/auth/logout"];
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function isAuthRoute(url?: string) {
  return AUTH_ROUTES.some((route) => url?.includes(route));
}

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  config.headers = config.headers ?? {};
  if (token && !isAuthRoute(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

let refreshPromise: Promise<string> | null = null;

/** Refreshes through the HttpOnly cookie. All callers share the same in-flight request. */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = httpClient
      .post<ApiResponse<RefreshResponse> | RefreshResponse>("/api/auth/refresh", undefined, {
        withCredentials: true,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      .then((response) => {
        const responseBody = response.data;
        const payload = responseBody && typeof responseBody === "object" && "data" in responseBody
          ? responseBody.data
          : responseBody;
        if (!payload?.accessToken) throw new Error("The server did not return a new access token.");
        setAccessToken(payload.accessToken);
        httpClient.defaults.headers.common.Authorization = `Bearer ${payload.accessToken}`;
        return payload.accessToken;
      })
      .catch((error) => {
        clearSession();
        delete httpClient.defaults.headers.common.Authorization;
        onUnauthorized?.();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const request = error.config as RetryableRequestConfig | undefined;
    if (error.response?.status !== 401 || !request || request._retry || isAuthRoute(request.url)) {
      return Promise.reject(error);
    }

    request._retry = true;
    try {
      const token = await refreshAccessToken();
      request.headers.Authorization = `Bearer ${token}`;
      return httpClient(request);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

/**
 * Unwraps the backend's ApiResponse<T> envelope. Throws ApiError with the
 * message/errors from the envelope (or a generic network message) on failure.
 */
async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const res = await promise;
    const envelope = res.data;
    if (!envelope || envelope.success === false) {
      throw new ApiError(envelope?.message || "Request failed", undefined, envelope?.errors);
    }
    return envelope.data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const axiosErr = err as AxiosError<ApiResponse<unknown>>;
    const envelope = axiosErr.response?.data;
    const friendly = getUserFacingError(axiosErr);
    throw new ApiError(envelope?.message || friendly.title, axiosErr.response?.status, envelope?.errors);
  }
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(httpClient.get(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(httpClient.post(url, body, config)),
  postWithMessage: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => {
    try {
      const response = await httpClient.post<ApiResponse<T>>(url, body, config);
      const envelope = response.data;
      if (!envelope || envelope.success === false) {
        throw new ApiError(envelope?.message || "Request failed", response.status, envelope?.errors);
      }
      return { data: envelope.data as T, message: envelope.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const axiosErr = err as AxiosError<ApiResponse<unknown>>;
      const envelope = axiosErr.response?.data;
      const friendly = getUserFacingError(axiosErr);
      throw new ApiError(envelope?.message || friendly.title, axiosErr.response?.status, envelope?.errors);
    }
  },
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(httpClient.put(url, body, config)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(httpClient.patch(url, body, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(httpClient.delete(url, config)),
};

/** Strips undefined/null/empty-string values so they aren't sent as query params. */
export function cleanParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      out[key] = value;
    }
  }
  return out;
}
