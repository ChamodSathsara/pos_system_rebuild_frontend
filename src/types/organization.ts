import { BranchStatus } from "./enums";

export interface Company {
  companyCode: string;
  companyName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  registrationNo?: string | null;
  taxId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateCompanyRequest {
  companyCode: string;
  companyName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  registrationNo?: string | null;
  taxId?: string | null;
}

export type UpdateCompanyRequest = Omit<CreateCompanyRequest, "companyCode">;

export interface Branch {
  branchCode: string;
  branchName: string;
  address?: string | null;
  phone?: string | null;
  status: BranchStatus;
  companyCode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateBranchRequest {
  branchCode: string;
  branchName: string;
  address?: string | null;
  phone?: string | null;
  status?: BranchStatus;
  companyCode?: string | null;
}

export type UpdateBranchRequest = Omit<CreateBranchRequest, "branchCode">;

export interface Warehouse {
  warehouseCode: string;
  warehouseName: string;
  address?: string | null;
  branchCode?: string | null;
  isActive: boolean;
  createdAt?: string | null;
}

export interface CreateWarehouseRequest {
  warehouseCode: string;
  warehouseName: string;
  address?: string | null;
  branchCode?: string | null;
  isActive?: boolean;
}

export type UpdateWarehouseRequest = Omit<CreateWarehouseRequest, "warehouseCode">;
