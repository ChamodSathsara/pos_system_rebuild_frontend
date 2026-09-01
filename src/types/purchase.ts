import { GrnReturnStatus, PurchaseOrderChangeField, PurchaseOrderHistoryAction, PurchaseOrderStatus } from "./enums";

export interface PurchaseOrderItem {
  id: number;
  poNo?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  receivedQuantity?: number | null;
  unitCost?: number | null;
  totalCost?: number | null;
}

export interface PurchaseOrder {
  poNo: string;
  vendorId?: number | null;
  vendorCode?: string | null;
  vendorName?: string | null;
  branchCode?: string | null;
  poDate?: string | null;
  expectedDate?: string | null;
  totalAmount?: number | null;
  remarks?: string | null;
  status: PurchaseOrderStatus;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderItemLine {
  itemCode: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderRequest {
  poNo?: string | null;
  vendorId: number;
  branchCode: string;
  poDate?: string | null;
  expectedDate?: string | null;
  remarks?: string | null;
  items: CreatePurchaseOrderItemLine[];
}

export interface UpdatePurchaseOrderRequest {
  expectedDate?: string | null;
  remarks?: string | null;
  items: CreatePurchaseOrderItemLine[];
}

export interface CreatePurchaseOrderItemRequest {
  poNo: string;
  itemCode: string;
  quantity: number;
  unitCost: number;
}

export interface UpdatePurchaseOrderItemRequest {
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrderHistoryChange {
  id: number;
  historyId?: number | null;
  field: PurchaseOrderChangeField;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface PurchaseOrderHistory {
  historyId: number;
  poNo?: string | null;
  action: PurchaseOrderHistoryAction;
  changedBy?: string | null;
  changedAt?: string | null;
  remarks?: string | null;
  changes: PurchaseOrderHistoryChange[];
}

export interface CreatePurchaseOrderHistoryRequest {
  poNo: string;
  action: "Approved" | "Rejected";
  remarks?: string | null;
}

// GRN
export interface GrnItem {
  grnItemId: number;
  grnId?: number | null;
  itemCode?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  unitCost?: number | null;
  totalCost?: number | null;
  batchNo?: string | null;
  expiryDate?: string | null;
}

export interface Grn {
  grnId: number;
  grnNo?: string | null;
  poNo?: string | null;
  vendorId?: number | null;
  vendorCode?: string | null;
  vendorName?: string | null;
  branchCode?: string | null;
  warehouseCode?: string | null;
  grnDate?: string | null;
  invoiceNo?: string | null;
  invoiceDate?: string | null;
  totalAmount?: number | null;
  remarks?: string | null;
  receivedBy?: string | null;
  createdAt?: string | null;
  items: GrnItem[];
}

export interface CreateGrnItemLine {
  itemCode: string;
  quantity: number;
  unitCost: number;
  batchNo?: string | null;
  expiryDate?: string | null;
}

export interface CreateGrnRequest {
  grnNo?: string | null;
  poNo: string;
  branchCode: string;
  warehouseCode: string;
  grnDate?: string | null;
  invoiceNo?: string | null;
  invoiceDate?: string | null;
  remarks?: string | null;
  items: CreateGrnItemLine[];
}

export interface GrnReturnItem {
  id: number;
  grnReturnId?: number | null;
  grnItemId?: number | null;
  itemCode?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  unitCost?: number | null;
  totalAmount?: number | null;
}

export interface GrnReturn {
  grnReturnId: number;
  grnId?: number | null;
  grnNo?: string | null;
  returnDate?: string | null;
  returnBy?: string | null;
  totalReturnAmount?: number | null;
  reason?: string | null;
  status: GrnReturnStatus;
  items: GrnReturnItem[];
}

export interface CreateGrnReturnItemLine {
  grnItemId: number;
  quantity: number;
}

export interface CreateGrnReturnRequest {
  grnId: number;
  returnDate?: string | null;
  reason?: string | null;
  items: CreateGrnReturnItemLine[];
}
