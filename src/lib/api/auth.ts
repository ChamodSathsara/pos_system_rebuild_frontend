import { api } from "./client";
import type { CurrentUser, LoginRequest, LoginResponse } from "@/types";

export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResponse>("/api/auth/login", body, { withCredentials: true }),
  logout: () => api.post<null>("/api/auth/logout", undefined, { withCredentials: true }),
  me: () => api.get<CurrentUser>("/api/auth/me"),
};
