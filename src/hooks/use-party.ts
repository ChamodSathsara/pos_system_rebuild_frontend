import { useQuery } from "@tanstack/react-query";
import { customersApi, vendorLedgersApi, vendorsApi } from "@/lib/api";
import { useApiMutation } from "./use-api-mutation";
import type {
  CreateCustomerRequest,
  CreateVendorRequest,
  RecordVendorPaymentRequest,
  UpdateVendorRequest,
} from "@/types";

export const pq = {
  customer: (code: string) => ["customers", code] as const,
  vendors: (isActive?: boolean) => ["vendors", isActive ?? "all"] as const,
  vendor: (id: number) => ["vendors", id] as const,
  ledgers: ["vendor-ledgers"] as const,
  ledgerByVendor: (vendorId: number) => ["vendor-ledgers", "vendor", vendorId] as const,
};

export function useCustomer(customerCode?: string) {
  return useQuery({
    queryKey: pq.customer(customerCode ?? ""),
    queryFn: () => customersApi.get(customerCode as string),
    enabled: !!customerCode,
  });
}
export function useCreateCustomer() {
  return useApiMutation((body: CreateCustomerRequest) => customersApi.create(body), {
    successMessage: "Customer created",
  });
}

export function useVendors(isActive?: boolean) {
  return useQuery({ queryKey: pq.vendors(isActive), queryFn: () => vendorsApi.list(isActive) });
}
export function useVendor(vendorId?: number) {
  return useQuery({
    queryKey: pq.vendor(vendorId ?? 0),
    queryFn: () => vendorsApi.get(vendorId as number),
    enabled: !!vendorId,
  });
}
export function useCreateVendor() {
  return useApiMutation((body: CreateVendorRequest) => vendorsApi.create(body), {
    successMessage: "Vendor created",
    invalidateKeys: [["vendors"]],
  });
}
export function useUpdateVendor() {
  return useApiMutation(({ id, body }: { id: number; body: UpdateVendorRequest }) => vendorsApi.update(id, body), {
    successMessage: "Vendor updated",
    invalidateKeys: [["vendors"]],
  });
}
export function useDeleteVendor() {
  return useApiMutation((id: number) => vendorsApi.remove(id), {
    successMessage: "Vendor deleted",
    invalidateKeys: [["vendors"]],
  });
}

export function useVendorLedgers() {
  return useQuery({ queryKey: pq.ledgers, queryFn: () => vendorLedgersApi.list() });
}
export function useVendorLedgerByVendor(vendorId?: number) {
  return useQuery({
    queryKey: pq.ledgerByVendor(vendorId ?? 0),
    queryFn: () => vendorLedgersApi.getByVendor(vendorId as number),
    enabled: !!vendorId,
  });
}
export function useRecordVendorPayment() {
  return useApiMutation(
    ({ vendorId, body }: { vendorId: number; body: RecordVendorPaymentRequest }) =>
      vendorLedgersApi.recordPayment(vendorId, body),
    { successMessage: "Payment recorded", invalidateKeys: [pq.ledgers, ["vendors"]] }
  );
}
