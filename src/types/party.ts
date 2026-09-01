import { CustomerType } from "./enums";

export interface Customer {
  customerCode: string;
  customerName: string;
  mobile?: string | null;
  address?: string | null;
  email?: string | null;
  customerType: CustomerType;
  loyaltyPoints: number;
  creditLimit: number;
  isActive: boolean;
  createdAt?: string | null;
}

export interface CreateCustomerRequest {
  customerCode?: string | null;
  customerName: string;
  mobile?: string | null;
  address?: string | null;
  email?: string | null;
  customerType?: CustomerType;
  creditLimit?: number;
}

export interface Vendor {
  vendorId: number;
  vendorCode: string;
  vendorName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  isActive: boolean;
  createdAt: string;
  outstandingBalance?: number | null;
}

export interface CreateVendorRequest {
  vendorCode?: string | null;
  vendorName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  isActive?: boolean;
}

export type UpdateVendorRequest = CreateVendorRequest;

export interface VendorLedger {
  ledgerId: number;
  vendorId?: number | null;
  vendorCode?: string | null;
  vendorName?: string | null;
  grnTotal?: number | null;
  returnTotal?: number | null;
  paidCredit?: number | null;
  outstandingBalance: number;
}

export interface UpdateVendorLedgerRequest {
  grnTotal: number;
  returnTotal: number;
  paidCredit: number;
}

export interface RecordVendorPaymentRequest {
  amount: number;
  remarks?: string | null;
}
