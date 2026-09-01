import { useQuery } from "@tanstack/react-query";
import { brandsApi, categoriesApi, itemLogsApi, ProductSearchParams, productsApi, taxMastersApi } from "@/lib/api";
import { useApiMutation } from "./use-api-mutation";
import type {
  CreateBrandRequest,
  CreateCategoryRequest,
  CreateProductRequest,
  CreateTaxMasterRequest,
  UpdateBrandRequest,
  UpdateCategoryRequest,
  UpdateProductRequest,
  UpdateTaxMasterRequest,
} from "@/types";

export const cq = {
  categories: (isActive?: boolean) => ["categories", isActive ?? "all"] as const,
  brands: (isActive?: boolean) => ["brands", isActive ?? "all"] as const,
  taxMasters: (isActive?: boolean) => ["tax-masters", isActive ?? "all"] as const,
  products: (params?: ProductSearchParams) => ["products", params ?? {}] as const,
  product: (itemCode: string) => ["products", itemCode] as const,
  itemLogs: (itemCode?: string) => ["item-logs", itemCode ?? "all"] as const,
};

export function useCategories(isActive?: boolean) {
  return useQuery({ queryKey: cq.categories(isActive), queryFn: () => categoriesApi.list(isActive) });
}
export function useCreateCategory() {
  return useApiMutation((body: CreateCategoryRequest) => categoriesApi.create(body), {
    successMessage: "Category created",
    invalidateKeys: [["categories"]],
  });
}
export function useUpdateCategory() {
  return useApiMutation(({ id, body }: { id: number; body: UpdateCategoryRequest }) => categoriesApi.update(id, body), {
    successMessage: "Category updated",
    invalidateKeys: [["categories"]],
  });
}
export function useDeleteCategory() {
  return useApiMutation((id: number) => categoriesApi.remove(id), {
    successMessage: "Category deleted",
    invalidateKeys: [["categories"]],
  });
}

export function useBrands(isActive?: boolean) {
  return useQuery({ queryKey: cq.brands(isActive), queryFn: () => brandsApi.list(isActive) });
}
export function useCreateBrand() {
  return useApiMutation((body: CreateBrandRequest) => brandsApi.create(body), {
    successMessage: "Brand created",
    invalidateKeys: [["brands"]],
  });
}
export function useUpdateBrand() {
  return useApiMutation(({ id, body }: { id: number; body: UpdateBrandRequest }) => brandsApi.update(id, body), {
    successMessage: "Brand updated",
    invalidateKeys: [["brands"]],
  });
}
export function useDeleteBrand() {
  return useApiMutation((id: number) => brandsApi.remove(id), {
    successMessage: "Brand deleted",
    invalidateKeys: [["brands"]],
  });
}

export function useTaxMasters(isActive?: boolean) {
  return useQuery({ queryKey: cq.taxMasters(isActive), queryFn: () => taxMastersApi.list(isActive) });
}
export function useCreateTaxMaster() {
  return useApiMutation((body: CreateTaxMasterRequest) => taxMastersApi.create(body), {
    successMessage: "Tax rate created",
    invalidateKeys: [["tax-masters"]],
  });
}
export function useUpdateTaxMaster() {
  return useApiMutation(
    ({ code, body }: { code: string; body: UpdateTaxMasterRequest }) => taxMastersApi.update(code, body),
    { successMessage: "Tax rate updated", invalidateKeys: [["tax-masters"]] }
  );
}
export function useDeleteTaxMaster() {
  return useApiMutation((code: string) => taxMastersApi.remove(code), {
    successMessage: "Tax rate deleted",
    invalidateKeys: [["tax-masters"]],
  });
}

export function useProducts(params?: ProductSearchParams) {
  return useQuery({ queryKey: cq.products(params), queryFn: () => productsApi.list(params) });
}
export function useProduct(itemCode?: string) {
  return useQuery({
    queryKey: cq.product(itemCode ?? ""),
    queryFn: () => productsApi.get(itemCode as string),
    enabled: !!itemCode,
  });
}
export function useCreateProduct() {
  return useApiMutation((body: CreateProductRequest) => productsApi.create(body), {
    successMessage: "Product created",
    invalidateKeys: [["products"]],
  });
}
export function useUpdateProduct() {
  return useApiMutation(
    ({ itemCode, body }: { itemCode: string; body: UpdateProductRequest }) => productsApi.update(itemCode, body),
    { successMessage: "Product updated", invalidateKeys: [["products"]] }
  );
}
export function useDeleteProduct() {
  return useApiMutation((itemCode: string) => productsApi.remove(itemCode), {
    successMessage: "Product deleted",
    invalidateKeys: [["products"]],
  });
}

export function useItemLogs(itemCode?: string) {
  return useQuery({ queryKey: cq.itemLogs(itemCode), queryFn: () => itemLogsApi.list({ itemCode }) });
}
