import { BatchStatus, DamageItemStatus, StockMovementType, StockReferenceType } from "./enums";

export interface StockInventory {
  stockId: number;
  itemCode: string;
  itemName?: string | null;
  branchCode: string;
  warehouseCode: string;
  currentQty: number;
  lastUpdated: string;
}

export interface CreateStockInventoryRequest {
  itemCode: string;
  branchCode: string;
  warehouseCode: string;
}

export interface StockBatch {
  batchId: number;
  stockId: number;
  batchNo: string;
  receivedQty: number;
  availableQty: number;
  unitCost: number;
  expiryDate?: string | null;
  receivedDate: string;
  status: BatchStatus;
}

export interface CreateStockBatchRequest {
  stockId: number;
  batchNo: string;
  receivedQty: number;
  unitCost: number;
  expiryDate?: string | null;
  receivedDate?: string | null;
  referenceNo?: string | null;
  referenceType?: StockReferenceType;
  remarks?: string | null;
}

export interface UpdateStockBatchRequest {
  batchNo: string;
  unitCost: number;
  expiryDate?: string | null;
  status: BatchStatus;
  remarks?: string | null;
}

export interface StockMovement {
  movementId: number;
  batchId: number;
  stockId: number;
  movementType: StockMovementType;
  referenceType: StockReferenceType;
  referenceNo?: string | null;
  qty: number;
  previousQty: number;
  newQty: number;
  unitCost: number;
  remarks?: string | null;
  createdAt: string;
  createdBy: string;
}

export interface CreateStockMovementRequest {
  stockId: number;
  batchId: number;
  movementType?: StockMovementType;
  referenceType?: StockReferenceType;
  referenceNo?: string | null;
  qty: number;
  unitCost?: number | null;
  remarks?: string | null;
}

export interface UpdateStockMovementRequest {
  referenceNo?: string | null;
  remarks?: string | null;
}

export interface DamageItem {
  damageId: number;
  itemCode?: string | null;
  itemName?: string | null;
  branchCode?: string | null;
  branchName?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  quantity?: number | null;
  costAmount?: number | null;
  reason?: string | null;
  damageDate?: string | null;
  reportedBy?: string | null;
  reportedByName?: string | null;
  status: DamageItemStatus;
}

export interface CreateDamageItemRequest {
  itemCode: string;
  branchCode: string;
  warehouseCode?: string | null;
  quantity: number;
  costAmount?: number | null;
  reason?: string | null;
  damageDate?: string | null;
}

export interface UpdateDamageItemRequest extends CreateDamageItemRequest {
  status: DamageItemStatus;
}
