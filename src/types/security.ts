export interface SystemUser {
  userCode: string;
  username: string;
  fullName?: string | null;
  email?: string | null;
  mobile?: string | null;
  branchCode?: string | null;
  roleId?: number | null;
  roleName?: string | null;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateSystemUserRequest {
  userCode?: string | null;
  username: string;
  password: string;
  fullName?: string | null;
  email?: string | null;
  mobile?: string | null;
  branchCode?: string | null;
  roleId?: number | null;
  isActive?: boolean;
}

export interface UpdateSystemUserRequest {
  fullName?: string | null;
  email?: string | null;
  mobile?: string | null;
  branchCode?: string | null;
  roleId?: number | null;
  isActive: boolean;
}

export interface UserRole {
  roleId: number;
  roleName: string;
  description?: string | null;
  createdAt?: string | null;
}

export interface UserRoleWithPermissions extends UserRole {
  permissions: Permission[];
}

export interface CreateUserRoleRequest {
  roleName: string;
  description?: string | null;
}

export interface Permission {
  permissionId: number;
  permissionName: string;
  description?: string | null;
}

export interface CreatePermissionRequest {
  permissionName: string;
  description?: string | null;
}

export interface UserRolePermission {
  roleId: number;
  roleName?: string | null;
  permissionId: number;
  permissionName?: string | null;
}
