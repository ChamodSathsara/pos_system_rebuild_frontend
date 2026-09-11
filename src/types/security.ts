export interface SystemUser {
  userCode: string;
  username: string;
  fullName?: string | null;
  email?: string | null;
  mobile?: string | null;
  branchCode?: string | null;
  warehouseCode?: string | null;
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
  warehouseCode?: string | null;
  roleId?: number | null;
  isActive?: boolean;
}

export interface UpdateSystemUserRequest {
  fullName?: string | null;
  email?: string | null;
  mobile?: string | null;
  branchCode?: string | null;
  warehouseCode?: string | null;
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

export interface AuditLog {
  logId: number;
  transactionId?: string | null;
  userCode?: string | null;
  username?: string | null;
  fullName?: string | null;
  action?: string | null;
  tableName?: string | null;
  recordId?: string | null;
  entityType?: string | null;
  branchCode?: string | null;
  warehouseCode?: string | null;
  actionStatus?: string | null;
  reason?: string | null;
  ipAddress?: string | null;
  correlationId?: string | null;
  metadata?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  actionTime?: string | null;
}

export interface AuditLogFilters {
  pageNumber?: number;
  pageSize?: number;
  userCode?: string;
  action?: string;
  tableName?: string;
  recordId?: string;
  branchCode?: string;
  warehouseCode?: string;
  transactionId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AuditLogPage {
  items: AuditLog[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
