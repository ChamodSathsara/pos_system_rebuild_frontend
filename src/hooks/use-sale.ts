import { useQuery } from "@tanstack/react-query";
import { paymentsApi, saleReturnsApi, salesApi } from "@/lib/api";
import { useApiMutation } from "./use-api-mutation";
import type {
  CancelPaymentRequest,
  CreatePaymentRequest,
  CreateSaleRequest,
  CreateSaleReturnRequest,
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
} from "@/types";

export const slq = {
  sales: (params?: Record<string, unknown>) => ["sales", params ?? {}] as const,
  sale: (invoiceNo: string) => ["sales", invoiceNo] as const,
  invoice: (invoiceNo: string) => ["sale-invoice", invoiceNo] as const,
  returns: (params?: Record<string, unknown>) => ["sale-returns", params ?? {}] as const,
  payments: (params?: Record<string, unknown>) => ["payments", params ?? {}] as const,
};

export function useSales(params?: {
  branchCode?: string;
  customerCode?: string;
  status?: SaleStatus;
  fromDate?: string;
  toDate?: string;
}) {
  return useQuery({ queryKey: slq.sales(params), queryFn: () => salesApi.list(params) });
}
export function useSale(invoiceNo?: string) {
  return useQuery({
    queryKey: slq.sale(invoiceNo ?? ""),
    queryFn: () => salesApi.get(invoiceNo as string),
    enabled: !!invoiceNo,
  });
}
export function useSaleInvoice(invoiceNo?: string) {
  return useQuery({
    queryKey: slq.invoice(invoiceNo ?? ""),
    queryFn: () => salesApi.invoice(invoiceNo as string),
    enabled: !!invoiceNo,
  });
}
export function useCreateSale() {
  return useApiMutation((body: CreateSaleRequest) => salesApi.create(body), {
    invalidateKeys: [["sales"], ["stock-inventories"], ["stock-batches"], ["stock-movements"], ["cashier-shifts"]],
  });
}
export function useCancelSale() {
  return useApiMutation((invoiceNo: string) => salesApi.cancel(invoiceNo), {
    successMessage: "Sale cancelled and stock restored",
    invalidateKeys: [["sales"], ["stock-inventories"], ["stock-batches"]],
  });
}

export function useSaleReturns(params?: { invoiceNo?: string; fromDate?: string; toDate?: string }) {
  return useQuery({ queryKey: slq.returns(params), queryFn: () => saleReturnsApi.list(params) });
}
export function useCreateSaleReturn() {
  return useApiMutation((body: CreateSaleReturnRequest) => saleReturnsApi.create(body), {
    successMessage: "Return recorded — stock restored",
    invalidateKeys: [["sale-returns"], ["sales"], ["stock-inventories"], ["stock-batches"]],
  });
}

export function usePayments(params?: { invoiceNo?: string; method?: PaymentMethod; status?: PaymentStatus }) {
  return useQuery({ queryKey: slq.payments(params), queryFn: () => paymentsApi.list(params) });
}
export function useCreatePayment() {
  return useApiMutation((body: CreatePaymentRequest) => paymentsApi.create(body), {
    successMessage: "Payment recorded",
    invalidateKeys: [["payments"], ["sales"]],
  });
}
export function useCancelPayment() {
  return useApiMutation(
    ({ id, body }: { id: number; body: CancelPaymentRequest }) => paymentsApi.cancel(id, body),
    { successMessage: "Payment cancelled", invalidateKeys: [["payments"], ["sales"]] }
  );
}
