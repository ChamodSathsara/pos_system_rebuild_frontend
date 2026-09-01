import { api, cleanParams } from "./client";
import type {
  Branch,
  Company,
  CreateBranchRequest,
  CreateCompanyRequest,
  CreateWarehouseRequest,
  UpdateBranchRequest,
  UpdateCompanyRequest,
  UpdateWarehouseRequest,
  Warehouse,
} from "@/types";

export const companiesApi = {
  list: () => api.get<Company[]>("/api/companies"),
  get: (companyCode: string) => api.get<Company>(`/api/companies/${companyCode}`),
  create: (body: CreateCompanyRequest) => api.post<Company>("/api/companies", body),
  update: (companyCode: string, body: UpdateCompanyRequest) =>
    api.put<Company>(`/api/companies/${companyCode}`, body),
  remove: (companyCode: string) => api.delete<null>(`/api/companies/${companyCode}`),
};

export const branchesApi = {
  list: (companyCode?: string) => api.get<Branch[]>("/api/branches", { params: cleanParams({ companyCode }) }),
  get: (branchCode: string) => api.get<Branch>(`/api/branches/${branchCode}`),
  create: (body: CreateBranchRequest) => api.post<Branch>("/api/branches", body),
  update: (branchCode: string, body: UpdateBranchRequest) => api.put<Branch>(`/api/branches/${branchCode}`, body),
  remove: (branchCode: string) => api.delete<null>(`/api/branches/${branchCode}`),
};

export const warehousesApi = {
  list: (branchCode?: string) => api.get<Warehouse[]>("/api/warehouses", { params: cleanParams({ branchCode }) }),
  get: (warehouseCode: string) => api.get<Warehouse>(`/api/warehouses/${warehouseCode}`),
  create: (body: CreateWarehouseRequest) => api.post<Warehouse>("/api/warehouses", body),
  update: (warehouseCode: string, body: UpdateWarehouseRequest) =>
    api.put<Warehouse>(`/api/warehouses/${warehouseCode}`, body),
  remove: (warehouseCode: string) => api.delete<null>(`/api/warehouses/${warehouseCode}`),
};
