import { api, cleanParams, httpClient } from "./client";
import type {
  CreateDamageItemRequest,
  CreateOpeningStockRequest,
  CreateStockBatchRequest,
  CreateStockInventoryRequest,
  CreateStockMovementRequest,
  DamageItem,
  DamageItemStatus,
  OpeningStockResult,
  StockBatch,
  StockInventory,
  StockMovement,
  UpdateDamageItemRequest,
  UpdateBatchSellingPriceRequest,
  UpdateStockBatchRequest,
  UpdateStockMovementRequest,
} from "@/types";

async function download(url: string, filename: string) {
  const response = await httpClient.get<Blob>(url, { responseType: "blob" });
  const href = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}

export const openingStocksApi = {
  create: (body: CreateOpeningStockRequest) =>
    api.postWithMessage<OpeningStockResult>("/api/opening-stocks", body),
};

export const centralStockReceiptsApi = {
  create: (body: import("@/types").CreateCentralStockReceiptRequest) =>
    api.postWithMessage<import("@/types").CentralStockReceipt>("/api/central-stock-receipts", body),
  list: (params?: { warehouseCode?: string; fromDate?: string; toDate?: string }) =>
    api.get<import("@/types").CentralStockReceipt[]>("/api/central-stock-receipts", { params: cleanParams({ ...params }) }),
  get: (receiptId: number) => api.get<import("@/types").CentralStockReceipt>(`/api/central-stock-receipts/${receiptId}`),
  receiptPdf: (receiptId: number, receiptNo: string) =>
    download(`/api/central-stock-receipts/${receiptId}/receipt.pdf`, `${receiptNo}.pdf`),
};

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
  updateSellingPrice: (batchId: number, body: UpdateBatchSellingPriceRequest) =>
    api.patch<StockBatch>(`/api/stock-batches/${batchId}/selling-price`, body),
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
