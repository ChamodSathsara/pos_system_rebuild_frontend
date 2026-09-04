import type { DamageItemStatus, PurchaseOrderStatus, StockMovementType, StockReferenceType } from "./enums";

export interface CurrentStockReportLine {
  stockId: number; itemCode: string; itemName: string; barcode?: string | null; categoryName?: string | null;
  brandName?: string | null; branchCode: string; warehouseCode: string; availableQty: number;
  reorderLevel?: number | null; averageUnitCost: number; stockValue: number; isBelowReorderLevel: boolean;
}
export interface CurrentStockReport { generatedAt: string; branchCode?: string | null; items: CurrentStockReportLine[]; totalQuantity: number; totalStockValue: number; }

export interface StockMovementReportLine {
  movementId: number; createdAt: string; itemCode: string; itemName?: string | null; branchCode: string;
  warehouseCode: string; batchId: number; batchNo?: string | null; movementType: StockMovementType;
  referenceType: StockReferenceType; referenceNo?: string | null; quantity: number; previousQty: number;
  newQty: number; unitCost: number; movementValue: number; createdBy?: string | null;
  createdByName?: string | null; remarks?: string | null;
}
export interface StockMovementReport { fromDate: string; toDate: string; branchCode?: string | null; movements: StockMovementReportLine[]; totalInQty: number; totalOutQty: number; totalInValue: number; totalOutValue: number; }

export interface PurchaseReportLine {
  poNo: string; poDate?: string | null; poStatus: PurchaseOrderStatus; vendorId?: number | null;
  vendorName?: string | null; branchCode?: string | null; itemCode: string; itemName?: string | null;
  orderedQty: number; receivedQty: number; outstandingQty: number; returnedQty: number; netReceivedQty: number;
  unitCost: number; orderedValue: number; receivedValue: number; returnValue: number; netPurchaseValue: number;
}
export interface PurchaseReport { fromDate: string; toDate: string; branchCode?: string | null; items: PurchaseReportLine[]; totalOrderedValue: number; totalReceivedValue: number; totalReturnValue: number; totalNetPurchaseValue: number; }

export interface ExpenseReportLine { expenseId: number; expenseDate?: string | null; branchCode?: string | null; branchName?: string | null; categoryId?: number | null; categoryName?: string | null; amount: number; description?: string | null; paidBy?: string | null; paidByName?: string | null; }
export interface ExpenseCategorySummary { categoryId?: number | null; categoryName?: string | null; expenseCount: number; totalAmount: number; }
export interface ExpenseReport { fromDate: string; toDate: string; branchCode?: string | null; expenses: ExpenseReportLine[]; categorySummary: ExpenseCategorySummary[]; totalExpenseCount: number; totalExpenseAmount: number; }

export interface DamageItemReportLine {
  damageId: number; damageDate?: string | null; itemCode?: string | null; itemName?: string | null;
  branchCode?: string | null; branchName?: string | null; warehouseCode?: string | null;
  warehouseName?: string | null; quantity: number; costAmount: number; reason?: string | null;
  reportedBy?: string | null; reportedByName?: string | null; status: DamageItemStatus;
}
export interface DamageItemReport { fromDate: string; toDate: string; branchCode?: string | null; items: DamageItemReportLine[]; totalDamageCount: number; totalQuantity: number; totalDamageCost: number; }

export interface ProfitReport { fromDate: string; toDate: string; branchCode?: string | null; grossSalesExcludingTax: number; discountTotal: number; salesReturnTotal: number; netRevenue: number; soldCost: number; returnedCost: number; netCostOfGoodsSold: number; grossProfit: number; expenseTotal: number; netProfit: number; grossProfitMarginPercentage: number; }

export interface CurrentStockReportQuery { branchCode?: string; warehouseCode?: string; itemCode?: string; categoryId?: number; onlyAvailable?: boolean; onlyBelowReorderLevel?: boolean; }
export interface StockMovementReportQuery { fromDate: string; toDate: string; branchCode?: string; warehouseCode?: string; itemCode?: string; movementType?: StockMovementType; referenceType?: StockReferenceType; referenceNo?: string; }
export interface PurchaseReportQuery { fromDate: string; toDate: string; branchCode?: string; vendorId?: number; itemCode?: string; status?: PurchaseOrderStatus; }
export interface ExpenseReportQuery { fromDate: string; toDate: string; branchCode?: string; categoryId?: number; paidBy?: string; }
export interface DamageItemReportQuery { fromDate: string; toDate: string; branchCode?: string; warehouseCode?: string; itemCode?: string; status?: DamageItemStatus; }
export interface ProfitReportQuery { fromDate: string; toDate: string; branchCode?: string; }
