import { api, cleanParams } from "./client";
import type {
  CreateDamageItemRequest,
  CreateStockBatchRequest,
  CreateStockInventoryRequest,
  CreateStockMovementRequest,
  DamageItem,
  DamageItemStatus,
  StockBatch,
  StockInventory,
  StockMovement,
  UpdateDamageItemRequest,
  UpdateStockBatchRequest,
  UpdateStockMovementRequest,
} from "@/types";

export const stockInventoriesApi = {
  list: (params?: { itemCode?: string; branchCode?: string; warehouseCode?: string; onlyBelowReorderLevel?: boolean }) =>
    api.get<StockInventory[]>("/api/stock-inventories", { params: cleanParams({ ...params }) }),
  get: (stockId: number) => api.get<StockInventory>(`/api/stock-inventories/${stockId}`),
  create: (body: CreateStockInventoryRequest) => api.post<StockInventory>("/api/stock-inventories", body),
  reconcile: (stockId: number) => api.put<StockInventory>(`/api/stock-inventories/${stockId}`, {}),
  remove: (stockId: number) => api.delete<null>(`/api/stock-inventories/${stockId}`),
};

export const stockBatchesApi = {
  listByStock: (stockId: number) => api.get<StockBatch[]>("/api/stock-batches", { params: { stockId } }),
  get: (batchId: number) => api.get<StockBatch>(`/api/stock-batches/${batchId}`),
  create: (body: CreateStockBatchRequest) => api.post<StockBatch>("/api/stock-batches", body),
  update: (batchId: number, body: UpdateStockBatchRequest) =>
    api.put<StockBatch>(`/api/stock-batches/${batchId}`, body),
  remove: (batchId: number) => api.delete<null>(`/api/stock-batches/${batchId}`),
};

export const stockMovementsApi = {
  list: (params?: { stockId?: number; batchId?: number; referenceNo?: string }) =>
    api.get<StockMovement[]>("/api/stock-movements", { params: cleanParams({ ...params }) }),
  get: (movementId: number) => api.get<StockMovement>(`/api/stock-movements/${movementId}`),
  create: (body: CreateStockMovementRequest) => api.post<StockMovement>("/api/stock-movements", body),
  update: (movementId: number, body: UpdateStockMovementRequest) =>
    api.put<StockMovement>(`/api/stock-movements/${movementId}`, body),
  remove: (movementId: number) => api.delete<null>(`/api/stock-movements/${movementId}`),
};

export const damageItemsApi = {
  list: (params?: {
    itemCode?: string;
    branchCode?: string;
    warehouseCode?: string;
    status?: DamageItemStatus;
    fromDate?: string;
    toDate?: string;
  }) => api.get<DamageItem[]>("/api/damage-items", { params: cleanParams({ ...params }) }),
  get: (damageId: number) => api.get<DamageItem>(`/api/damage-items/${damageId}`),
  create: (body: CreateDamageItemRequest) => api.post<DamageItem>("/api/damage-items", body),
  update: (damageId: number, body: UpdateDamageItemRequest) =>
    api.put<DamageItem>(`/api/damage-items/${damageId}`, body),
  remove: (damageId: number) => api.delete<null>(`/api/damage-items/${damageId}`),
};
