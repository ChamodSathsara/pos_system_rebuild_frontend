import { ItemGroup, UnitOfMeasure } from "./enums";

export interface Category {
  categoryId: number;
  categoryName: string;
  parentCategoryId?: number | null;
  parentCategoryName?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface CreateCategoryRequest {
  categoryName: string;
  parentCategoryId?: number | null;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateCategoryRequest = CreateCategoryRequest;

export interface Brand {
  brandId: number;
  brandName: string;
  description?: string | null;
  isActive: boolean;
}

export interface CreateBrandRequest {
  brandName: string;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateBrandRequest = CreateBrandRequest;

export interface TaxMaster {
  taxCode: string;
  taxName: string;
  percentage: number;
  description?: string | null;
  isActive: boolean;
}

export interface CreateTaxMasterRequest {
  taxCode: string;
  taxName: string;
  percentage: number;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateTaxMasterRequest = Omit<CreateTaxMasterRequest, "taxCode">;

export interface Product {
  itemCode: string;
  itemName: string;
  description?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  brandId?: number | null;
  brandName?: string | null;
  unitOfMeasure: UnitOfMeasure;
  itemGroup: ItemGroup;
  barcode?: string | null;
  costPrice?: number | null;
  sellingPrice?: number | null;
  reorderLevel?: number | null;
  taxCode?: string | null;
  taxPercentage?: number | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PosTerminalItem {
  stockId: number;
  itemCode: string;
  itemName: string;
  description?: string | null;
  barcode?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  brandId?: number | null;
  brandName?: string | null;
  unitOfMeasure: UnitOfMeasure;
  itemGroup: ItemGroup;
  price: number;
  availableQty: number;
  reorderLevel?: number | null;
  taxCode?: string | null;
  taxPercentage?: number | null;
  branchCode: string;
  warehouseCode: string;
  isAvailable: boolean;
}

export interface CreateProductRequest {
  itemCode?: string | null;
  itemName: string;
  description?: string | null;
  categoryId?: number | null;
  brandId?: number | null;
  unitOfMeasure: UnitOfMeasure;
  itemGroup: ItemGroup;
  barcode?: string | null;
  costPrice?: number | null;
  sellingPrice?: number | null;
  reorderLevel?: number | null;
  taxCode?: string | null;
  isActive?: boolean;
}

export type UpdateProductRequest = Omit<CreateProductRequest, "itemCode">;

export interface ItemLog {
  logId: number;
  itemCode?: string | null;
  itemName?: string | null;
  action?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy?: string | null;
  changedByName?: string | null;
  changedAt?: string | null;
}
