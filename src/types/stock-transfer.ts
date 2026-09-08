export const StockTransferStatus = ["Submitted", "Accepted", "Picking", "Dispatched", "Received", "Rejected", "Cancelled"] as const;
export type StockTransferStatus = (typeof StockTransferStatus)[number];

export interface StockTransferLine {
  transferRequestLineId: number;
  itemCode: string;
  itemName?: string | null;
  requestedQty: number;
  approvedQty: number;
  dispatchedQty: number;
  receivedQty: number;
  remarks?: string | null;
}
export interface TransferDispatchLine { dispatchLineId: number; transferRequestLineId: number; itemCode?: string; itemName?: string; batchId: number; batchNo?: string; quantity: number; unitCost: number; }
export interface TransferDispatch { dispatchId: number; dispatchNo: string; transferRequestId: number; dispatchedAt: string; vehicleNo?: string; driverName?: string; status?: string; lines: TransferDispatchLine[]; }
export interface StockTransfer { transferRequestId: number; requestNo: string; sourceWarehouseCode: string; sourceWarehouseName?: string; destinationWarehouseCode: string; destinationWarehouseName?: string; status: StockTransferStatus; requestDate: string; requiredDate?: string | null; remarks?: string | null; lines: StockTransferLine[]; dispatches?: TransferDispatch[]; }
export interface CreateStockTransferRequest { sourceWarehouseCode: string; destinationWarehouseCode: string; requiredDate: string; remarks?: string | null; lines: { itemCode: string; quantity: number; remarks?: string | null }[]; }
export interface AcceptStockTransferRequest { remarks?: string | null; lines: { transferRequestLineId: number; approvedQty: number }[]; }
export interface DispatchStockTransferRequest { vehicleNo: string; driverName: string; remarks?: string | null; lines: { transferRequestLineId: number; batchId: number; quantity: number }[]; }
export interface ReceiveTransferRequest { remarks?: string | null; lines: { dispatchLineId: number; receivedQty: number; damagedQty: number; shortQty: number; remarks?: string | null }[]; }
export interface TransferReceipt { receiptId: number; receiptNo: string; dispatchId: number; receivedAt: string; }
