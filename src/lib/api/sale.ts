import { api, cleanParams, httpClient } from "./client";
import type {
  CancelPaymentRequest,
  CreatePaymentRequest,
  CreateSaleRequest,
  CreateSaleReturnRequest,
  Payment,
  PaymentMethod,
  PaymentStatus,
  PosTerminalItem,
  Sale,
  SaleInvoice,
  SaleReturn,
  SaleStatus,
} from "@/types";

export interface PosTerminalItemParams {
  keyword?: string;
  categoryId?: number;
  warehouseCode?: string;
  onlyAvailable?: boolean;
}

export const posTerminalApi = {
  items: (params?: PosTerminalItemParams) =>
    api.get<PosTerminalItem[]>("/api/pos-terminal/items", {
      params: cleanParams({ ...params }),
      headers: { Accept: "application/json" },
    }),
};

export const salesApi = {
  list: (params?: {
    branchCode?: string;
    customerCode?: string;
    status?: SaleStatus;
    fromDate?: string;
    toDate?: string;
  }) => api.get<Sale[]>("/api/sales", { params: cleanParams({ ...params }) }),
  get: (invoiceNo: string) => api.get<Sale>(`/api/sales/${invoiceNo}`),
  create: (body: CreateSaleRequest) => api.post<Sale>("/api/sales", body),
  invoice: (invoiceNo: string) => api.get<SaleInvoice>(`/api/sales/${invoiceNo}/invoice`),
  invoiceHtml: async (invoiceNo: string) => {
    const response = await httpClient.get<string>(`/api/sales/${invoiceNo}/invoice`, {
      params: { format: "html" },
      headers: { Accept: "text/html" },
      responseType: "text",
    });
    return response.data;
  },
  cancel: (invoiceNo: string) => api.post<Sale>(`/api/sales/${invoiceNo}/cancel`),
};

export const saleReturnsApi = {
  list: (params?: { invoiceNo?: string; fromDate?: string; toDate?: string }) =>
    api.get<SaleReturn[]>("/api/sale-returns", { params: cleanParams({ ...params }) }),
  get: (returnNo: string) => api.get<SaleReturn>(`/api/sale-returns/${returnNo}`),
  create: (body: CreateSaleReturnRequest) => api.post<SaleReturn>("/api/sale-returns", body),
};

export const paymentsApi = {
  list: (params?: { invoiceNo?: string; method?: PaymentMethod; status?: PaymentStatus }) =>
    api.get<Payment[]>("/api/payments", { params: cleanParams({ ...params }) }),
  get: (paymentId: number) => api.get<Payment>(`/api/payments/${paymentId}`),
  create: (body: CreatePaymentRequest) => api.post<Payment>("/api/payments", body),
  cancel: (paymentId: number, body: CancelPaymentRequest) =>
    api.post<Payment>(`/api/payments/${paymentId}/cancel`, body),
};
