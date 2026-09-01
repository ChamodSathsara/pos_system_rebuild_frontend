import { api, cleanParams } from "./client";
import type {
  CreateCustomerRequest,
  CreateVendorRequest,
  Customer,
  RecordVendorPaymentRequest,
  UpdateVendorLedgerRequest,
  UpdateVendorRequest,
  Vendor,
  VendorLedger,
} from "@/types";

export const customersApi = {
  create: (body: CreateCustomerRequest) => api.post<Customer>("/api/customers", body),
  get: (customerCode: string) => api.get<Customer>(`/api/customers/${customerCode}`),
};

export const vendorsApi = {
  list: (isActive?: boolean) => api.get<Vendor[]>("/api/vendors", { params: cleanParams({ isActive }) }),
  get: (vendorId: number) => api.get<Vendor>(`/api/vendors/${vendorId}`),
  getByCode: (vendorCode: string) => api.get<Vendor>(`/api/vendors/code/${vendorCode}`),
  create: (body: CreateVendorRequest) => api.post<Vendor>("/api/vendors", body),
  update: (vendorId: number, body: UpdateVendorRequest) => api.put<Vendor>(`/api/vendors/${vendorId}`, body),
  remove: (vendorId: number) => api.delete<null>(`/api/vendors/${vendorId}`),
};

export const vendorLedgersApi = {
  list: () => api.get<VendorLedger[]>("/api/vendor-ledgers"),
  get: (ledgerId: number) => api.get<VendorLedger>(`/api/vendor-ledgers/${ledgerId}`),
  getByVendor: (vendorId: number) => api.get<VendorLedger>(`/api/vendor-ledgers/vendor/${vendorId}`),
  update: (ledgerId: number, body: UpdateVendorLedgerRequest) =>
    api.put<VendorLedger>(`/api/vendor-ledgers/${ledgerId}`, body),
  recordPayment: (vendorId: number, body: RecordVendorPaymentRequest) =>
    api.post<VendorLedger>(`/api/vendor-ledgers/vendor/${vendorId}/payments`, body),
  remove: (ledgerId: number) => api.delete<null>(`/api/vendor-ledgers/${ledgerId}`),
};
