import { useQuery } from "@tanstack/react-query";
import { branchesApi, companiesApi, warehousesApi } from "@/lib/api";
import { useApiMutation } from "./use-api-mutation";
import type { CreateBranchRequest, CreateCompanyRequest, CreateWarehouseRequest, UpdateBranchRequest, UpdateCompanyRequest, UpdateWarehouseRequest } from "@/types";

export const qk = {
  companies: ["companies"] as const,
  branches: (companyCode?: string) => ["branches", companyCode ?? "all"] as const,
  warehouses: (branchCode?: string) => ["warehouses", branchCode ?? "all"] as const,
};

export function useCompanies() {
  return useQuery({ queryKey: qk.companies, queryFn: () => companiesApi.list() });
}

export function useBranches(companyCode?: string) {
  return useQuery({ queryKey: qk.branches(companyCode), queryFn: () => branchesApi.list(companyCode) });
}

export function useWarehouses(branchCode?: string) {
  return useQuery({ queryKey: qk.warehouses(branchCode), queryFn: () => warehousesApi.list(branchCode) });
}

export function useCreateCompany() {
  return useApiMutation((body: CreateCompanyRequest) => companiesApi.create(body), {
    successMessage: "Company created",
    invalidateKeys: [qk.companies],
  });
}
export function useUpdateCompany() {
  return useApiMutation(
    ({ code, body }: { code: string; body: UpdateCompanyRequest }) => companiesApi.update(code, body),
    { successMessage: "Company updated", invalidateKeys: [qk.companies] }
  );
}
export function useDeleteCompany() {
  return useApiMutation((code: string) => companiesApi.remove(code), {
    successMessage: "Company deleted",
    invalidateKeys: [qk.companies],
  });
}

export function useCreateBranch() {
  return useApiMutation((body: CreateBranchRequest) => branchesApi.create(body), {
    successMessage: "Branch created",
    invalidateKeys: [["branches"]],
  });
}
export function useUpdateBranch() {
  return useApiMutation(({ code, body }: { code: string; body: UpdateBranchRequest }) => branchesApi.update(code, body), {
    successMessage: "Branch updated",
    invalidateKeys: [["branches"]],
  });
}
export function useDeleteBranch() {
  return useApiMutation((code: string) => branchesApi.remove(code), {
    successMessage: "Branch deleted",
    invalidateKeys: [["branches"]],
  });
}

export function useCreateWarehouse() {
  return useApiMutation((body: CreateWarehouseRequest) => warehousesApi.create(body), {
    successMessage: "Warehouse created",
    invalidateKeys: [["warehouses"]],
  });
}
export function useUpdateWarehouse() {
  return useApiMutation(
    ({ code, body }: { code: string; body: UpdateWarehouseRequest }) => warehousesApi.update(code, body),
    { successMessage: "Warehouse updated", invalidateKeys: [["warehouses"]] }
  );
}
export function useDeleteWarehouse() {
  return useApiMutation((code: string) => warehousesApi.remove(code), {
    successMessage: "Warehouse deleted",
    invalidateKeys: [["warehouses"]],
  });
}
