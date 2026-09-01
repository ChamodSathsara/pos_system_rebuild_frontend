import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/env";
import { clearSession, getAccessToken } from "@/lib/token";
import type { ApiResponse } from "@/types";

export class ApiError extends Error {
  status?: number;
  errors?: string[] | null;

  constructor(message: string, status?: number, errors?: string[] | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      clearSession();
      onUnauthorized?.();
    }
    return Promise.reject(error);
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
    const message =
      envelope?.message ||
      (axiosErr.code === "ERR_NETWORK"
        ? "Cannot reach the server. Check your connection or try again."
        : axiosErr.message) ||
      "Something went wrong.";
    throw new ApiError(message, axiosErr.response?.status, envelope?.errors);
  }
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(httpClient.get(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(httpClient.post(url, body, config)),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(httpClient.put(url, body, config)),
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
