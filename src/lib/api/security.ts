import { api } from "./client";
import type {
  CreatePermissionRequest,
  CreateSystemUserRequest,
  CreateUserRoleRequest,
  Permission,
  SystemUser,
  UpdateSystemUserRequest,
  UserRole,
  UserRolePermission,
  UserRoleWithPermissions,
} from "@/types";

export const systemUsersApi = {
  list: () => api.get<SystemUser[]>("/api/system-users"),
  get: (userCode: string) => api.get<SystemUser>(`/api/system-users/${userCode}`),
  create: (body: CreateSystemUserRequest) => api.post<SystemUser>("/api/system-users", body),
  update: (userCode: string, body: UpdateSystemUserRequest) =>
    api.put<SystemUser>(`/api/system-users/${userCode}`, body),
  remove: (userCode: string) => api.delete<null>(`/api/system-users/${userCode}`),
};

export const userRolesApi = {
  list: () => api.get<UserRole[]>("/api/user-roles"),
  get: (roleId: number) => api.get<UserRole>(`/api/user-roles/${roleId}`),
  details: (roleId: number) => api.get<UserRoleWithPermissions>(`/api/user-roles/${roleId}/details`),
  create: (body: CreateUserRoleRequest) => api.post<UserRole>("/api/user-roles", body),
  update: (roleId: number, body: CreateUserRoleRequest) => api.put<UserRole>(`/api/user-roles/${roleId}`, body),
  remove: (roleId: number) => api.delete<null>(`/api/user-roles/${roleId}`),
  permissionsForRole: (roleId: number) => api.get<Permission[]>(`/api/user-roles/${roleId}/permissions`),
  assignPermission: (roleId: number, permissionId: number) =>
    api.post<null>(`/api/user-roles/${roleId}/permissions`, { permissionId }),
  unassignPermission: (roleId: number, permissionId: number) =>
    api.delete<null>(`/api/user-roles/${roleId}/permissions/${permissionId}`),
};

export const permissionsApi = {
  list: () => api.get<Permission[]>("/api/permissions"),
  get: (permissionId: number) => api.get<Permission>(`/api/permissions/${permissionId}`),
  create: (body: CreatePermissionRequest) => api.post<Permission>("/api/permissions", body),
  update: (permissionId: number, body: CreatePermissionRequest) =>
    api.put<Permission>(`/api/permissions/${permissionId}`, body),
  remove: (permissionId: number) => api.delete<null>(`/api/permissions/${permissionId}`),
};

export const userRolePermissionsApi = {
  listAll: () => api.get<UserRolePermission[]>("/api/user-role-permissions"),
};
