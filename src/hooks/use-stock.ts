import { useQuery } from "@tanstack/react-query";
import { damageItemsApi, openingStocksApi, stockBatchesApi, stockInventoriesApi, stockMovementsApi } from "@/lib/api";
import { useApiMutation } from "./use-api-mutation";
import type {
  CreateDamageItemRequest,
  CreateOpeningStockRequest,
  CreateStockBatchRequest,
  CreateStockInventoryRequest,
  CreateStockMovementRequest,
  DamageItemStatus,
  UpdateDamageItemRequest,
  UpdateStockBatchRequest,
} from "@/types";

export const sq = {
  inventories: (params?: Record<string, unknown>) => ["stock-inventories", params ?? {}] as const,
  batches: (stockId: number) => ["stock-batches", stockId] as const,
  movements: (params?: Record<string, unknown>) => ["stock-movements", params ?? {}] as const,
  damage: (params?: Record<string, unknown>) => ["damage-items", params ?? {}] as const,
};

export function useCreateOpeningStock() {
  return useApiMutation((body: CreateOpeningStockRequest) => openingStocksApi.create(body), {
    successMessage: (response) => response.message,
    invalidateKeys: [["stock-inventories"], ["stock-batches"], ["stock-movements"]],
  });
}

export function useStockInventories(params?: {
  itemCode?: string;
  branchCode?: string;
  warehouseCode?: string;
  onlyBelowReorderLevel?: boolean;
}) {
  return useQuery({ queryKey: sq.inventories(params), queryFn: () => stockInventoriesApi.list(params) });
}
export function useCreateStockInventory() {
  return useApiMutation((body: CreateStockInventoryRequest) => stockInventoriesApi.create(body), {
    successMessage: "Stock tracking row created",
    invalidateKeys: [["stock-inventories"]],
  });
}
export function useReconcileStock() {
  return useApiMutation((stockId: number) => stockInventoriesApi.reconcile(stockId), {
    successMessage: "Stock reconciled",
    invalidateKeys: [["stock-inventories"]],
  });
}

export function useStockBatches(stockId?: number) {
  return useQuery({
    queryKey: sq.batches(stockId ?? 0),
    queryFn: () => stockBatchesApi.listByStock(stockId as number),
    enabled: !!stockId,
  });
}
export function useCreateStockBatch() {
  return useApiMutation((body: CreateStockBatchRequest) => stockBatchesApi.create(body), {
    successMessage: "Stock received",
    invalidateKeys: [["stock-batches"], ["stock-inventories"], ["stock-movements"]],
  });
}
export function useUpdateStockBatch() {
  return useApiMutation(
    ({ batchId, body }: { batchId: number; body: UpdateStockBatchRequest }) => stockBatchesApi.update(batchId, body),
    { successMessage: "Batch updated", invalidateKeys: [["stock-batches"], ["stock-inventories"], ["stock-movements"]] }
  );
}

export function useStockMovements(params?: { stockId?: number; batchId?: number; referenceNo?: string }) {
  return useQuery({ queryKey: sq.movements(params), queryFn: () => stockMovementsApi.list(params) });
}
export function useCreateStockMovement() {
  return useApiMutation((body: CreateStockMovementRequest) => stockMovementsApi.create(body), {
    successMessage: "Adjustment recorded",
    invalidateKeys: [["stock-movements"], ["stock-inventories"], ["stock-batches"]],
  });
}

export function useDamageItems(params?: {
  itemCode?: string;
  branchCode?: string;
  warehouseCode?: string;
  status?: DamageItemStatus;
}) {
  return useQuery({ queryKey: sq.damage(params), queryFn: () => damageItemsApi.list(params) });
}
export function useCreateDamageItem() {
  return useApiMutation((body: CreateDamageItemRequest) => damageItemsApi.create(body), {
    successMessage: "Damage reported",
    invalidateKeys: [["damage-items"]],
  });
}
export function useUpdateDamageItem() {
  return useApiMutation(
    ({ id, body }: { id: number; body: UpdateDamageItemRequest }) => damageItemsApi.update(id, body),
    { successMessage: "Damage record updated", invalidateKeys: [["damage-items"], ["stock-inventories"], ["stock-batches"]] }
  );
}
