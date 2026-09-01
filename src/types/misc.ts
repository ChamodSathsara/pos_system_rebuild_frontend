import {
  CashierShiftHistoryAction,
  CashierShiftStatus,
  DiscountApplicableTo,
  DiscountMethod,
  DiscountType,
  PaymentMethod,
  ShiftDifferenceReasonType,
} from "./enums";

// ---------------- Discounts ----------------
export interface Discount {
  discountCode: string;
  discountName: string;
  discountType: DiscountType;
  discountMethod: DiscountMethod;
  discountValue?: number | null;
  itemCode?: string | null;
  itemName?: string | null;
  minQuantity?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  minBillAmount?: number | null;
  applicableTo: DiscountApplicableTo;
  isActive: boolean;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateDiscountRequest {
  discountCode?: string | null;
  discountName: string;
  discountType: DiscountType;
  discountMethod: DiscountMethod;
  discountValue: number;
  itemCode?: string | null;
  minQuantity?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  minBillAmount?: number | null;
  isActive?: boolean;
}

export type UpdateDiscountRequest = Omit<CreateDiscountRequest, "discountCode" | "discountType">;

export interface EvaluateDiscountRequest {
  itemCode?: string | null;
  quantity?: number | null;
  itemAmount?: number | null;
  billAmount?: number | null;
  evaluationDate?: string | null;
  evaluationTime?: string | null;
}

export interface ApplicableDiscount {
  discountCode: string;
  discountName: string;
  discountType: DiscountType;
  discountMethod: DiscountMethod;
  discountValue: number;
  calculatedAmount: number;
}

export interface DiscountEvaluationResult {
  itemLevelDiscounts: ApplicableDiscount[];
  billLevelDiscounts: ApplicableDiscount[];
  totalItemDiscount: number;
  totalBillDiscount: number;
}

// ---------------- Expenses ----------------
export interface ExpenseCategory {
  categoryId: number;
  categoryName: string;
  description?: string | null;
}

export interface CreateExpenseCategoryRequest {
  categoryName: string;
  description?: string | null;
}

export interface Expense {
  expenseId: number;
  branchCode?: string | null;
  branchName?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  amount?: number | null;
  expenseDate?: string | null;
  description?: string | null;
  paidBy?: string | null;
  paidByName?: string | null;
  createdAt?: string | null;
}

export interface CreateExpenseRequest {
  branchCode: string;
  categoryId: number;
  amount: number;
  expenseDate?: string | null;
  description?: string | null;
}

export type UpdateExpenseRequest = CreateExpenseRequest;

// ---------------- Cashier Shifts ----------------
export interface CashierShift {
  shiftId: number;
  branchCode?: string | null;
  branchName?: string | null;
  cashierCode?: string | null;
  cashierName?: string | null;
  openingCash: number;
  openedAt: string;
  expectedCash?: number | null;
  actualCash?: number | null;
  differenceAmount?: number | null;
  reasonType?: ShiftDifferenceReasonType | null;
  reasonDescription?: string | null;
  status: CashierShiftStatus;
  closedBy?: string | null;
  closedByName?: string | null;
  closedAt?: string | null;
}

export interface OpenCashierShiftRequest {
  branchCode: string;
  openingCash: number;
}

export interface RecalculateCashierShiftRequest {
  actualCash: number;
}

export interface CloseCashierShiftRequest {
  actualCash: number;
  reasonType?: ShiftDifferenceReasonType | null;
  reasonDescription?: string | null;
}

export interface CashierShiftHistory {
  historyId: number;
  shiftId?: number | null;
  action: CashierShiftHistoryAction;
  expectedCash?: number | null;
  actualCash?: number | null;
  differenceAmount?: number | null;
  reasonType?: ShiftDifferenceReasonType | null;
  reasonDescription?: string | null;
  changedBy?: string | null;
  changedByName?: string | null;
  changedAt?: string | null;
  remarks?: string | null;
}

// ---------------- Reports ----------------
export interface PaymentMethodSummary {
  paymentMethod: PaymentMethod;
  count: number;
  amount: number;
}

export interface DailySalesReportRow {
  date: string;
  invoiceCount: number;
  grossSales: number;
  discountTotal: number;
  taxTotal: number;
  returnsTotal: number;
  netSales: number;
  paymentSummary: PaymentMethodSummary[];
}

export interface DailySalesReport {
  fromDate: string;
  toDate: string;
  branchCode?: string | null;
  branchName?: string | null;
  days: DailySalesReportRow[];
  total: DailySalesReportRow;
}

export interface SalesSummaryReport {
  fromDate: string;
  toDate: string;
  branchCode?: string | null;
  branchName?: string | null;
  totalInvoices: number;
  totalQuantitySold: number;
  grossSales: number;
  discountTotal: number;
  taxTotal: number;
  returnsTotal: number;
  netSales: number;
}

export interface ItemWiseSalesReportLine {
  itemCode?: string | null;
  itemName?: string | null;
  quantitySold: number;
  sellingAmount: number;
  discountAmount: number;
  returnQuantity: number;
  returnAmount: number;
  netSalesAmount: number;
}

export interface ItemWiseSalesReport {
  fromDate: string;
  toDate: string;
  branchCode?: string | null;
  branchName?: string | null;
  items: ItemWiseSalesReportLine[];
  total: ItemWiseSalesReportLine;
}

export interface SalesReturnReportItem {
  itemCode?: string | null;
  itemName?: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface SalesReturnReportLine {
  returnNo: string;
  returnDate?: string | null;
  invoiceNo?: string | null;
  branchCode?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  reason?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  totalReturnAmount: number;
  items: SalesReturnReportItem[];
}

export interface SalesReturnReport {
  fromDate: string;
  toDate: string;
  branchCode?: string | null;
  branchName?: string | null;
  totalReturns: number;
  totalReturnAmount: number;
  returns: SalesReturnReportLine[];
}
