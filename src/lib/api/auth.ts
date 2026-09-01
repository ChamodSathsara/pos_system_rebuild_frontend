import { api } from "./client";
import type { CurrentUser, LoginRequest, LoginResponse } from "@/types";

export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResponse>("/api/auth/login", body),
  logout: (refreshToken?: string) => api.post<null>("/api/auth/logout", refreshToken ? { refreshToken } : {}),
  me: () => api.get<CurrentUser>("/api/auth/me"),
};
