import { Role } from "./enums";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CurrentUser {
  userCode: string;
  username: string;
  fullName?: string | null;
  email?: string | null;
  mobile?: string | null;
  branchCode?: string | null;
  roleId?: number | null;
  roleName?: Role | string | null;
  isActive: boolean;
  lastLogin?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: CurrentUser;
}
