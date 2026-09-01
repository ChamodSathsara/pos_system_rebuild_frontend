import { useQuery } from "@tanstack/react-query";
import { permissionsApi, systemUsersApi, userRolePermissionsApi, userRolesApi } from "@/lib/api";
import { useApiMutation } from "./use-api-mutation";
import type { CreatePermissionRequest, CreateSystemUserRequest, CreateUserRoleRequest, UpdateSystemUserRequest } from "@/types";

export const skq = {
  users: ["system-users"] as const,
  roles: ["user-roles"] as const,
  roleDetails: (id: number) => ["user-roles", id, "details"] as const,
  permissions: ["permissions"] as const,
  allRolePermissions: ["user-role-permissions"] as const,
};

export function useSystemUsers() {
  return useQuery({ queryKey: skq.users, queryFn: () => systemUsersApi.list() });
}
export function useCreateSystemUser() {
  return useApiMutation((body: CreateSystemUserRequest) => systemUsersApi.create(body), {
    successMessage: "User created",
    invalidateKeys: [skq.users],
  });
}
export function useUpdateSystemUser() {
  return useApiMutation(
    ({ userCode, body }: { userCode: string; body: UpdateSystemUserRequest }) => systemUsersApi.update(userCode, body),
    { successMessage: "User updated", invalidateKeys: [skq.users] }
  );
}
export function useDeleteSystemUser() {
  return useApiMutation((userCode: string) => systemUsersApi.remove(userCode), {
    successMessage: "User deleted",
    invalidateKeys: [skq.users],
  });
}

export function useUserRoles() {
  return useQuery({ queryKey: skq.roles, queryFn: () => userRolesApi.list() });
}
export function useUserRoleDetails(roleId?: number) {
  return useQuery({
    queryKey: skq.roleDetails(roleId ?? 0),
    queryFn: () => userRolesApi.details(roleId as number),
    enabled: !!roleId,
  });
}
export function useCreateUserRole() {
  return useApiMutation((body: CreateUserRoleRequest) => userRolesApi.create(body), {
    successMessage: "Role created",
    invalidateKeys: [skq.roles],
  });
}
export function useUpdateUserRole() {
  return useApiMutation(
    ({ roleId, body }: { roleId: number; body: CreateUserRoleRequest }) => userRolesApi.update(roleId, body),
    { successMessage: "Role updated", invalidateKeys: [skq.roles] }
  );
}
export function useDeleteUserRole() {
  return useApiMutation((roleId: number) => userRolesApi.remove(roleId), {
    successMessage: "Role deleted",
    invalidateKeys: [skq.roles],
  });
}
export function useAssignPermission() {
  return useApiMutation(
    ({ roleId, permissionId }: { roleId: number; permissionId: number }) => userRolesApi.assignPermission(roleId, permissionId),
    { successMessage: "Permission assigned", invalidateKeys: [skq.roles, skq.allRolePermissions] }
  );
}
export function useUnassignPermission() {
  return useApiMutation(
    ({ roleId, permissionId }: { roleId: number; permissionId: number }) => userRolesApi.unassignPermission(roleId, permissionId),
    { successMessage: "Permission removed", invalidateKeys: [skq.roles, skq.allRolePermissions] }
  );
}

export function usePermissions() {
  return useQuery({ queryKey: skq.permissions, queryFn: () => permissionsApi.list() });
}
export function useCreatePermission() {
  return useApiMutation((body: CreatePermissionRequest) => permissionsApi.create(body), {
    successMessage: "Permission created",
    invalidateKeys: [skq.permissions],
  });
}
export function useDeletePermission() {
  return useApiMutation((id: number) => permissionsApi.remove(id), {
    successMessage: "Permission deleted",
    invalidateKeys: [skq.permissions],
  });
}

export function useAllRolePermissions() {
  return useQuery({ queryKey: skq.allRolePermissions, queryFn: () => userRolePermissionsApi.listAll() });
}
