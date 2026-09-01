import { api, cleanParams } from "./client";
import type {
  CreateGrnReturnRequest,
  CreateGrnRequest,
  CreatePurchaseOrderHistoryRequest,
  CreatePurchaseOrderItemRequest,
  CreatePurchaseOrderRequest,
  Grn,
  GrnReturn,
  GrnReturnStatus,
  PurchaseOrder,
  PurchaseOrderHistory,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  UpdatePurchaseOrderItemRequest,
  UpdatePurchaseOrderRequest,
} from "@/types";

export const purchaseOrdersApi = {
  list: (params?: {
    vendorId?: number;
    branchCode?: string;
    status?: PurchaseOrderStatus;
    fromDate?: string;
    toDate?: string;
  }) => api.get<PurchaseOrder[]>("/api/purchase-orders", { params: cleanParams({ ...params }) }),
  get: (poNo: string) => api.get<PurchaseOrder>(`/api/purchase-orders/${poNo}`),
  create: (body: CreatePurchaseOrderRequest) => api.post<PurchaseOrder>("/api/purchase-orders", body),
  update: (poNo: string, body: UpdatePurchaseOrderRequest) =>
    api.put<PurchaseOrder>(`/api/purchase-orders/${poNo}`, body),
  approve: (poNo: string, remarks?: string) =>
    api.post<PurchaseOrder>(`/api/purchase-orders/${poNo}/approve`, { remarks }),
  reject: (poNo: string, remarks?: string) =>
    api.post<PurchaseOrder>(`/api/purchase-orders/${poNo}/reject`, { remarks }),
  cancel: (poNo: string, remarks?: string) =>
    api.post<PurchaseOrder>(`/api/purchase-orders/${poNo}/cancel`, { remarks }),
  remove: (poNo: string) => api.delete<null>(`/api/purchase-orders/${poNo}`),
};

export const purchaseOrderItemsApi = {
  list: (poNo: string) => api.get<PurchaseOrderItem[]>("/api/purchase-order-items", { params: { poNo } }),
  get: (id: number) => api.get<PurchaseOrderItem>(`/api/purchase-order-items/${id}`),
  create: (body: CreatePurchaseOrderItemRequest) => api.post<PurchaseOrderItem>("/api/purchase-order-items", body),
  update: (id: number, body: UpdatePurchaseOrderItemRequest) =>
    api.put<PurchaseOrderItem>(`/api/purchase-order-items/${id}`, body),
  remove: (id: number) => api.delete<null>(`/api/purchase-order-items/${id}`),
};

export const purchaseOrderHistoriesApi = {
  list: (poNo: string) => api.get<PurchaseOrderHistory[]>("/api/purchase-order-histories", { params: { poNo } }),
  create: (body: CreatePurchaseOrderHistoryRequest) =>
    api.post<PurchaseOrderHistory>("/api/purchase-order-histories", body),
};

export const grnMastersApi = {
  list: (params?: { poNo?: string; vendorId?: number; branchCode?: string }) =>
    api.get<Grn[]>("/api/grn-masters", { params: cleanParams({ ...params }) }),
  get: (grnId: number) => api.get<Grn>(`/api/grn-masters/${grnId}`),
  create: (body: CreateGrnRequest) => api.post<Grn>("/api/grn-masters", body),
  remove: (grnId: number) => api.delete<null>(`/api/grn-masters/${grnId}`),
};

export const grnReturnsApi = {
  list: (params?: { grnId?: number; status?: GrnReturnStatus; fromDate?: string; toDate?: string }) =>
    api.get<GrnReturn[]>("/api/grn-returns", { params: cleanParams({ ...params }) }),
  get: (grnReturnId: number) => api.get<GrnReturn>(`/api/grn-returns/${grnReturnId}`),
  create: (body: CreateGrnReturnRequest) => api.post<GrnReturn>("/api/grn-returns", body),
};
