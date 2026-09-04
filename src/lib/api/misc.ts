import { api, cleanParams, httpClient } from "./client";
import type {
  CashierShift,
  CashierShiftHistory,
  CashierShiftStatus,
  CloseCashierShiftRequest,
  CreateDiscountRequest,
  CreateExpenseCategoryRequest,
  CreateExpenseRequest,
  DailySalesReport,
  Discount,
  DiscountEvaluationResult,
  DiscountType,
  EvaluateDiscountRequest,
  Expense,
  ExpenseCategory,
  ItemWiseSalesReport,
  OpenCashierShiftRequest,
  RecalculateCashierShiftRequest,
  SalesReturnReport,
  SalesSummaryReport,
  UpdateDiscountRequest,
  UpdateExpenseRequest,
  CurrentStockReport,
  CurrentStockReportQuery,
  DamageItemReport,
  DamageItemReportQuery,
  ExpenseReport,
  ExpenseReportQuery,
  ProfitReport,
  ProfitReportQuery,
  PurchaseReport,
  PurchaseReportQuery,
  StockMovementReport,
  StockMovementReportQuery,
} from "@/types";

export const discountsApi = {
  list: (params?: { discountType?: DiscountType; isActive?: boolean; itemCode?: string }) =>
    api.get<Discount[]>("/api/discounts", { params: cleanParams({ ...params }) }),
  get: (discountCode: string) => api.get<Discount>(`/api/discounts/${discountCode}`),
  create: (body: CreateDiscountRequest) => api.post<Discount>("/api/discounts", body),
  update: (discountCode: string, body: UpdateDiscountRequest) =>
    api.put<Discount>(`/api/discounts/${discountCode}`, body),
  remove: (discountCode: string) => api.delete<null>(`/api/discounts/${discountCode}`),
  evaluate: (body: EvaluateDiscountRequest) => api.post<DiscountEvaluationResult>("/api/discounts/evaluate", body),
};

export const expenseCategoriesApi = {
  list: () => api.get<ExpenseCategory[]>("/api/expense-categories"),
  get: (categoryId: number) => api.get<ExpenseCategory>(`/api/expense-categories/${categoryId}`),
  create: (body: CreateExpenseCategoryRequest) => api.post<ExpenseCategory>("/api/expense-categories", body),
  update: (categoryId: number, body: CreateExpenseCategoryRequest) =>
    api.put<ExpenseCategory>(`/api/expense-categories/${categoryId}`, body),
  remove: (categoryId: number) => api.delete<null>(`/api/expense-categories/${categoryId}`),
};

export const expensesApi = {
  list: (params?: { branchCode?: string; categoryId?: number; paidBy?: string; fromDate?: string; toDate?: string }) =>
    api.get<Expense[]>("/api/expenses", { params: cleanParams({ ...params }) }),
  get: (expenseId: number) => api.get<Expense>(`/api/expenses/${expenseId}`),
  create: (body: CreateExpenseRequest) => api.post<Expense>("/api/expenses", body),
  update: (expenseId: number, body: UpdateExpenseRequest) => api.put<Expense>(`/api/expenses/${expenseId}`, body),
  remove: (expenseId: number) => api.delete<null>(`/api/expenses/${expenseId}`),
};

export const cashierShiftsApi = {
  list: (params?: { branchCode?: string; cashierCode?: string; status?: CashierShiftStatus; fromDate?: string; toDate?: string }) =>
    api.get<CashierShift[]>("/api/cashier-shifts", { params: cleanParams({ ...params }) }),
  get: (shiftId: number) => api.get<CashierShift>(`/api/cashier-shifts/${shiftId}`),
  history: (shiftId: number) => api.get<CashierShiftHistory[]>(`/api/cashier-shifts/${shiftId}/history`),
  open: (body: OpenCashierShiftRequest) => api.post<CashierShift>("/api/cashier-shifts", body),
  recalculate: (shiftId: number, body: RecalculateCashierShiftRequest) =>
    api.post<CashierShift>(`/api/cashier-shifts/${shiftId}/recalculate`, body),
  close: (shiftId: number, body: CloseCashierShiftRequest) =>
    api.post<CashierShift>(`/api/cashier-shifts/${shiftId}/close`, body),
};

export interface ReportQuery {
  fromDate: string; // yyyy-MM-dd
  toDate: string;
  branchCode?: string;
  cashierCode?: string;
  customerCode?: string;
  itemCode?: string;
  categoryId?: number;
}

export const reportsApi = {
  currentStock: (q: CurrentStockReportQuery) =>
    api.get<CurrentStockReport>("/api/reports/stock/current", { params: cleanParams({ ...q }) }),
  stockMovements: (q: StockMovementReportQuery) =>
    api.get<StockMovementReport>("/api/reports/stock/movements", { params: cleanParams({ ...q }) }),
  purchases: (q: PurchaseReportQuery) =>
    api.get<PurchaseReport>("/api/reports/purchases", { params: cleanParams({ ...q }) }),
  expenses: (q: ExpenseReportQuery) =>
    api.get<ExpenseReport>("/api/reports/expenses", { params: cleanParams({ ...q }) }),
  damageItems: (q: DamageItemReportQuery) =>
    api.get<DamageItemReport>("/api/reports/damage-items", { params: cleanParams({ ...q }) }),
  profit: (q: ProfitReportQuery) =>
    api.get<ProfitReport>("/api/reports/profit", { params: cleanParams({ ...q }) }),
  daily: (q: ReportQuery) => api.get<DailySalesReport>("/api/reports/sales/daily", { params: cleanParams({ ...q }) }),
  summary: (q: ReportQuery) =>
    api.get<SalesSummaryReport>("/api/reports/sales/summary", { params: cleanParams({ ...q }) }),
  itemWise: (q: ReportQuery) =>
    api.get<ItemWiseSalesReport>("/api/reports/sales/item-wise", { params: cleanParams({ ...q }) }),
  returns: (q: ReportQuery) =>
    api.get<SalesReturnReport>("/api/reports/sales/returns", { params: cleanParams({ ...q }) }),
  exportUrl: (
    kind: "daily" | "summary" | "item-wise" | "returns",
    format: "pdf" | "excel",
    q: ReportQuery
  ) => {
    const params = new URLSearchParams(cleanParams({ ...q, format }) as Record<string, string>);
    return `/api/reports/sales/${kind}?${params.toString()}`;
  },
  download: async (kind: "daily" | "summary" | "item-wise" | "returns", format: "pdf" | "excel", q: ReportQuery) => {
    const params = cleanParams({ ...q, format });
    const res = await httpClient.get(`/api/reports/sales/${kind}`, { params, responseType: "blob" });
    const disposition = res.headers["content-disposition"] as string | undefined;
    const match = disposition?.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || `${kind}-report.${format === "excel" ? "xlsx" : "pdf"}`;
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
