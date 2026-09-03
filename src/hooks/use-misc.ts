import { useQuery } from "@tanstack/react-query";
import {
  cashierShiftsApi,
  discountsApi,
  expenseCategoriesApi,
  expensesApi,
  reportsApi,
  type ReportQuery,
} from "@/lib/api";
import { useApiMutation } from "./use-api-mutation";
import type {
  CashierShiftStatus,
  CloseCashierShiftRequest,
  CreateDiscountRequest,
  CreateExpenseCategoryRequest,
  CreateExpenseRequest,
  DiscountType,
  EvaluateDiscountRequest,
  OpenCashierShiftRequest,
  RecalculateCashierShiftRequest,
  UpdateDiscountRequest,
  UpdateExpenseRequest,
  CurrentStockReportQuery,
  ExpenseReportQuery,
  ProfitReportQuery,
  PurchaseReportQuery,
  StockMovementReportQuery,
} from "@/types";

export const mq = {
  discounts: (params?: Record<string, unknown>) => ["discounts", params ?? {}] as const,
  expenseCategories: ["expense-categories"] as const,
  expenses: (params?: Record<string, unknown>) => ["expenses", params ?? {}] as const,
  shifts: (params?: Record<string, unknown>) => ["cashier-shifts", params ?? {}] as const,
  shift: (id: number) => ["cashier-shifts", id] as const,
  shiftHistory: (id: number) => ["cashier-shifts", id, "history"] as const,
  dailyReport: (q: ReportQuery) => ["reports", "daily", q] as const,
  summaryReport: (q: ReportQuery) => ["reports", "summary", q] as const,
  itemWiseReport: (q: ReportQuery) => ["reports", "item-wise", q] as const,
  returnsReport: (q: ReportQuery) => ["reports", "returns", q] as const,
  currentStockReport: (q: CurrentStockReportQuery) => ["reports", "current-stock", q] as const,
  stockMovementReport: (q: StockMovementReportQuery) => ["reports", "stock-movements", q] as const,
  purchaseReport: (q: PurchaseReportQuery) => ["reports", "purchases", q] as const,
  expenseReport: (q: ExpenseReportQuery) => ["reports", "expense-report", q] as const,
  profitReport: (q: ProfitReportQuery) => ["reports", "profit", q] as const,
};

// Discounts
export function useDiscounts(params?: { discountType?: DiscountType; isActive?: boolean; itemCode?: string }) {
  return useQuery({ queryKey: mq.discounts(params), queryFn: () => discountsApi.list(params) });
}
export function useCreateDiscount() {
  return useApiMutation((body: CreateDiscountRequest) => discountsApi.create(body), {
    successMessage: "Discount created",
    invalidateKeys: [["discounts"]],
  });
}
export function useUpdateDiscount() {
  return useApiMutation(
    ({ code, body }: { code: string; body: UpdateDiscountRequest }) => discountsApi.update(code, body),
    { successMessage: "Discount updated", invalidateKeys: [["discounts"]] }
  );
}
export function useDeleteDiscount() {
  return useApiMutation((code: string) => discountsApi.remove(code), {
    successMessage: "Discount deleted",
    invalidateKeys: [["discounts"]],
  });
}
export function useEvaluateDiscount() {
  return useApiMutation((body: EvaluateDiscountRequest) => discountsApi.evaluate(body));
}

// Expenses
export function useExpenseCategories() {
  return useQuery({ queryKey: mq.expenseCategories, queryFn: () => expenseCategoriesApi.list() });
}
export function useCreateExpenseCategory() {
  return useApiMutation((body: CreateExpenseCategoryRequest) => expenseCategoriesApi.create(body), {
    successMessage: "Category created",
    invalidateKeys: [mq.expenseCategories],
  });
}
export function useExpenses(params?: { branchCode?: string; categoryId?: number; fromDate?: string; toDate?: string }) {
  return useQuery({ queryKey: mq.expenses(params), queryFn: () => expensesApi.list(params) });
}
export function useCreateExpense() {
  return useApiMutation((body: CreateExpenseRequest) => expensesApi.create(body), {
    successMessage: "Expense recorded",
    invalidateKeys: [["expenses"], ["cashier-shifts"]],
  });
}
export function useUpdateExpense() {
  return useApiMutation(({ id, body }: { id: number; body: UpdateExpenseRequest }) => expensesApi.update(id, body), {
    successMessage: "Expense updated",
    invalidateKeys: [["expenses"]],
  });
}
export function useDeleteExpense() {
  return useApiMutation((id: number) => expensesApi.remove(id), {
    successMessage: "Expense deleted",
    invalidateKeys: [["expenses"]],
  });
}

// Cashier shifts
export function useCashierShifts(params?: {
  branchCode?: string;
  cashierCode?: string;
  status?: CashierShiftStatus;
  fromDate?: string;
  toDate?: string;
}) {
  return useQuery({ queryKey: mq.shifts(params), queryFn: () => cashierShiftsApi.list(params) });
}
export function useCashierShift(id?: number) {
  return useQuery({ queryKey: mq.shift(id ?? 0), queryFn: () => cashierShiftsApi.get(id as number), enabled: !!id });
}
export function useCashierShiftHistory(id?: number) {
  return useQuery({
    queryKey: mq.shiftHistory(id ?? 0),
    queryFn: () => cashierShiftsApi.history(id as number),
    enabled: !!id,
  });
}
export function useOpenShift() {
  return useApiMutation((body: OpenCashierShiftRequest) => cashierShiftsApi.open(body), {
    successMessage: "Shift opened",
    invalidateKeys: [["cashier-shifts"]],
  });
}
export function useRecalculateShift() {
  return useApiMutation(
    ({ id, body }: { id: number; body: RecalculateCashierShiftRequest }) => cashierShiftsApi.recalculate(id, body),
    { successMessage: "Shift recalculated", invalidateKeys: [["cashier-shifts"]] }
  );
}
export function useCloseShift() {
  return useApiMutation(
    ({ id, body }: { id: number; body: CloseCashierShiftRequest }) => cashierShiftsApi.close(id, body),
    { successMessage: "Shift closed", invalidateKeys: [["cashier-shifts"]] }
  );
}

// Reports
export function useDailySalesReport(q: ReportQuery, enabled = true) {
  return useQuery({ queryKey: mq.dailyReport(q), queryFn: () => reportsApi.daily(q), enabled });
}
export function useSalesSummaryReport(q: ReportQuery, enabled = true) {
  return useQuery({ queryKey: mq.summaryReport(q), queryFn: () => reportsApi.summary(q), enabled });
}
export function useItemWiseSalesReport(q: ReportQuery, enabled = true) {
  return useQuery({ queryKey: mq.itemWiseReport(q), queryFn: () => reportsApi.itemWise(q), enabled });
}
export function useSalesReturnReport(q: ReportQuery, enabled = true) {
  return useQuery({ queryKey: mq.returnsReport(q), queryFn: () => reportsApi.returns(q), enabled });
}
export function useCurrentStockReport(q: CurrentStockReportQuery, enabled = true) {
  return useQuery({ queryKey: mq.currentStockReport(q), queryFn: () => reportsApi.currentStock(q), enabled });
}
export function useStockMovementReport(q: StockMovementReportQuery, enabled = true) {
  return useQuery({ queryKey: mq.stockMovementReport(q), queryFn: () => reportsApi.stockMovements(q), enabled });
}
export function usePurchaseReport(q: PurchaseReportQuery, enabled = true) {
  return useQuery({ queryKey: mq.purchaseReport(q), queryFn: () => reportsApi.purchases(q), enabled });
}
export function useExpenseReport(q: ExpenseReportQuery, enabled = true) {
  return useQuery({ queryKey: mq.expenseReport(q), queryFn: () => reportsApi.expenses(q), enabled });
}
export function useProfitReport(q: ProfitReportQuery, enabled = true) {
  return useQuery({ queryKey: mq.profitReport(q), queryFn: () => reportsApi.profit(q), enabled });
}
