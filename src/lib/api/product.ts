import { api, cleanParams } from "./client";
import type {
  Brand,
  Category,
  CreateBrandRequest,
  CreateCategoryRequest,
  CreateProductRequest,
  CreateTaxMasterRequest,
  ItemLog,
  Product,
  TaxMaster,
  UpdateBrandRequest,
  UpdateCategoryRequest,
  UpdateProductRequest,
  UpdateTaxMasterRequest,
} from "@/types";

export const categoriesApi = {
  list: (isActive?: boolean) => api.get<Category[]>("/api/categories", { params: cleanParams({ isActive }) }),
  get: (categoryId: number) => api.get<Category>(`/api/categories/${categoryId}`),
  create: (body: CreateCategoryRequest) => api.post<Category>("/api/categories", body),
  update: (categoryId: number, body: UpdateCategoryRequest) =>
    api.put<Category>(`/api/categories/${categoryId}`, body),
  remove: (categoryId: number) => api.delete<null>(`/api/categories/${categoryId}`),
};

export const brandsApi = {
  list: (isActive?: boolean) => api.get<Brand[]>("/api/brands", { params: cleanParams({ isActive }) }),
  get: (brandId: number) => api.get<Brand>(`/api/brands/${brandId}`),
  create: (body: CreateBrandRequest) => api.post<Brand>("/api/brands", body),
  update: (brandId: number, body: UpdateBrandRequest) => api.put<Brand>(`/api/brands/${brandId}`, body),
  remove: (brandId: number) => api.delete<null>(`/api/brands/${brandId}`),
};

export const taxMastersApi = {
  list: (isActive?: boolean) => api.get<TaxMaster[]>("/api/tax-masters", { params: cleanParams({ isActive }) }),
  get: (taxCode: string) => api.get<TaxMaster>(`/api/tax-masters/${taxCode}`),
  create: (body: CreateTaxMasterRequest) => api.post<TaxMaster>("/api/tax-masters", body),
  update: (taxCode: string, body: UpdateTaxMasterRequest) => api.put<TaxMaster>(`/api/tax-masters/${taxCode}`, body),
  remove: (taxCode: string) => api.delete<null>(`/api/tax-masters/${taxCode}`),
};

export interface ProductSearchParams {
  categoryId?: number;
  brandId?: number;
  isActive?: boolean;
  keyword?: string;
}

export const productsApi = {
  list: (params?: ProductSearchParams) =>
    api.get<Product[]>("/api/products", { params: cleanParams({ ...params }) }),
  get: (itemCode: string) => api.get<Product>(`/api/products/${itemCode}`),
  create: (body: CreateProductRequest) => api.post<Product>("/api/products", body),
  update: (itemCode: string, body: UpdateProductRequest) => api.put<Product>(`/api/products/${itemCode}`, body),
  remove: (itemCode: string) => api.delete<null>(`/api/products/${itemCode}`),
};

export const itemLogsApi = {
  list: (params?: { itemCode?: string; action?: string; changedBy?: string }) =>
    api.get<ItemLog[]>("/api/item-logs", { params: cleanParams({ ...params }) }),
  get: (logId: number) => api.get<ItemLog>(`/api/item-logs/${logId}`),
};
