import { useQuery } from "@tanstack/react-query";
import { grnMastersApi, grnReturnsApi, purchaseOrderHistoriesApi, purchaseOrderItemsApi, purchaseOrdersApi } from "@/lib/api";
import { useApiMutation } from "./use-api-mutation";
import type {
  CreateGrnReturnRequest,
  CreateGrnRequest,
  CreatePurchaseOrderItemRequest,
  CreatePurchaseOrderRequest,
  GrnReturnStatus,
  PurchaseOrderStatus,
  UpdatePurchaseOrderItemRequest,
  UpdatePurchaseOrderRequest,
} from "@/types";

export const puq = {
  pos: (params?: Record<string, unknown>) => ["purchase-orders", params ?? {}] as const,
  po: (poNo: string) => ["purchase-orders", poNo] as const,
  poHistory: (poNo: string) => ["purchase-order-histories", poNo] as const,
  grns: (params?: Record<string, unknown>) => ["grn-masters", params ?? {}] as const,
  grn: (id: number) => ["grn-masters", id] as const,
  grnReturns: (params?: Record<string, unknown>) => ["grn-returns", params ?? {}] as const,
};

export function usePurchaseOrders(params?: {
  vendorId?: number;
  branchCode?: string;
  status?: PurchaseOrderStatus;
  fromDate?: string;
  toDate?: string;
}) {
  return useQuery({ queryKey: puq.pos(params), queryFn: () => purchaseOrdersApi.list(params) });
}
export function usePurchaseOrder(poNo?: string) {
  return useQuery({
    queryKey: puq.po(poNo ?? ""),
    queryFn: () => purchaseOrdersApi.get(poNo as string),
    enabled: !!poNo,
  });
}
export function usePurchaseOrderHistory(poNo?: string) {
  return useQuery({
    queryKey: puq.poHistory(poNo ?? ""),
    queryFn: () => purchaseOrderHistoriesApi.list(poNo as string),
    enabled: !!poNo,
  });
}
export function useCreatePurchaseOrder() {
  return useApiMutation((body: CreatePurchaseOrderRequest) => purchaseOrdersApi.create(body), {
    successMessage: "Purchase order created",
    invalidateKeys: [["purchase-orders"]],
  });
}
export function useUpdatePurchaseOrder() {
  return useApiMutation(
    ({ poNo, body }: { poNo: string; body: UpdatePurchaseOrderRequest }) => purchaseOrdersApi.update(poNo, body),
    { successMessage: "Purchase order updated", invalidateKeys: [["purchase-orders"]] }
  );
}
export function useApprovePO() {
  return useApiMutation(({ poNo, remarks }: { poNo: string; remarks?: string }) => purchaseOrdersApi.approve(poNo, remarks), {
    successMessage: "Purchase order approved",
    invalidateKeys: [["purchase-orders"], ["purchase-order-histories"]],
  });
}
export function useRejectPO() {
  return useApiMutation(({ poNo, remarks }: { poNo: string; remarks?: string }) => purchaseOrdersApi.reject(poNo, remarks), {
    successMessage: "Purchase order rejected",
    invalidateKeys: [["purchase-orders"], ["purchase-order-histories"]],
  });
}
export function useCancelPO() {
  return useApiMutation(({ poNo, remarks }: { poNo: string; remarks?: string }) => purchaseOrdersApi.cancel(poNo, remarks), {
    successMessage: "Purchase order cancelled",
    invalidateKeys: [["purchase-orders"], ["purchase-order-histories"]],
  });
}
export function useDeletePO() {
  return useApiMutation((poNo: string) => purchaseOrdersApi.remove(poNo), {
    successMessage: "Purchase order deleted",
    invalidateKeys: [["purchase-orders"]],
  });
}

export function useCreatePOItem() {
  return useApiMutation((body: CreatePurchaseOrderItemRequest) => purchaseOrderItemsApi.create(body), {
    successMessage: "Line item added",
    invalidateKeys: [["purchase-orders"]],
  });
}
export function useUpdatePOItem() {
  return useApiMutation(
    ({ id, body }: { id: number; body: UpdatePurchaseOrderItemRequest }) => purchaseOrderItemsApi.update(id, body),
    { successMessage: "Line item updated", invalidateKeys: [["purchase-orders"]] }
  );
}
export function useDeletePOItem() {
  return useApiMutation((id: number) => purchaseOrderItemsApi.remove(id), {
    successMessage: "Line item removed",
    invalidateKeys: [["purchase-orders"]],
  });
}

export function useGrns(params?: { poNo?: string; vendorId?: number; branchCode?: string }) {
  return useQuery({ queryKey: puq.grns(params), queryFn: () => grnMastersApi.list(params) });
}
export function useGrn(grnId?: number) {
  return useQuery({ queryKey: puq.grn(grnId ?? 0), queryFn: () => grnMastersApi.get(grnId as number), enabled: !!grnId });
}
export function useCreateGrn() {
  return useApiMutation((body: CreateGrnRequest) => grnMastersApi.create(body), {
    successMessage: "GRN posted — stock updated",
    invalidateKeys: [["grn-masters"], ["purchase-orders"], ["stock-inventories"], ["stock-batches"], ["vendor-ledgers"]],
  });
}

export function useGrnReturns(params?: { grnId?: number; status?: GrnReturnStatus; fromDate?: string; toDate?: string }) {
  return useQuery({ queryKey: puq.grnReturns(params), queryFn: () => grnReturnsApi.list(params) });
}
export function useCreateGrnReturn() {
  return useApiMutation((body: CreateGrnReturnRequest) => grnReturnsApi.create(body), {
    successMessage: "GRN return recorded",
    invalidateKeys: [
      ["grn-returns"],
      ["grn-masters"],
      ["purchase-orders"],
      ["stock-inventories"],
      ["stock-batches"],
      ["vendor-ledgers"],
    ],
  });
}
