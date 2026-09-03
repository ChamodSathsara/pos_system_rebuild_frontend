"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { useProducts, useCategories } from "@/hooks/use-catalog";
import { useWarehouses } from "@/hooks/use-organization";
import { useVendors } from "@/hooks/use-party";
import { useCurrentStockReport, useExpenseCategories, useExpenseReport, useProfitReport, usePurchaseReport, useStockMovementReport } from "@/hooks/use-misc";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { PurchaseOrderStatus, StockMovementType, StockReferenceType } from "@/types";
import type { CurrentStockReportLine, ExpenseReportLine, PurchaseReportLine, StockMovementReportLine } from "@/types";

interface ReportScope { branchCode?: string; warehouseBranchCode?: string; fromDate: string; toDate: string; datesValid: boolean; }
const ALL = "__all__";
const qty = (value?: number | null) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value ?? 0);
const errorText = (error: unknown) => error instanceof ApiError
  ? error.status === 403 ? "Access denied: you do not have permission to view this report." : error.message
  : "Could not load this report.";

function FilterSelect({ label, value, onChange, children, className = "w-44" }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; className?: string }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? "" : next)}><SelectTrigger className={className}><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>All</SelectItem>{children}</SelectContent></Select></div>;
}

function Summaries({ values }: { values: Array<{ label: string; value: string; tone?: string }> }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{values.map((item) => <Card key={item.label} className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p><p className={`num mt-2 text-xl font-bold ${item.tone ?? ""}`}>{item.value}</p></Card>)}</div>;
}

export function CurrentStockTab({ branchCode, warehouseBranchCode }: Pick<ReportScope, "branchCode" | "warehouseBranchCode">) {
  const [warehouseCode, setWarehouseCode] = useState(""); const [itemCode, setItemCode] = useState(""); const [categoryId, setCategoryId] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false); const [onlyBelow, setOnlyBelow] = useState(false);
  const { data: products } = useProducts(); const { data: categories } = useCategories(true); const { data: warehouses } = useWarehouses(warehouseBranchCode);
  const query = useCurrentStockReport({ branchCode, warehouseCode: warehouseCode || undefined, itemCode: itemCode || undefined, categoryId: categoryId ? Number(categoryId) : undefined, onlyAvailable, onlyBelowReorderLevel: onlyBelow });
  const columns = useMemo<ColumnDef<CurrentStockReportLine>[]>(() => [
    { accessorKey: "itemName", header: "Item", cell: ({ row }) => <div><p className="font-medium">{row.original.itemName}</p><p className="text-xs text-muted-foreground">{row.original.itemCode} · {row.original.barcode || "No barcode"}</p></div> },
    { accessorKey: "categoryName", header: "Category", cell: ({ row }) => row.original.categoryName || "—" },
    { accessorKey: "warehouseCode", header: "Branch / Warehouse", cell: ({ row }) => `${row.original.branchCode} / ${row.original.warehouseCode}` },
    { accessorKey: "availableQty", header: "Available", cell: ({ row }) => <span className="num">{qty(row.original.availableQty)}</span> },
    { accessorKey: "reorderLevel", header: "Reorder", cell: ({ row }) => <span className="num">{qty(row.original.reorderLevel)}</span> },
    { accessorKey: "averageUnitCost", header: "Avg. Cost", cell: ({ row }) => <span className="num">{formatMoney(row.original.averageUnitCost)}</span> },
    { accessorKey: "stockValue", header: "Stock Value", cell: ({ row }) => <span className="num font-semibold">{formatMoney(row.original.stockValue)}</span> },
    { accessorKey: "isBelowReorderLevel", header: "Status", cell: ({ row }) => row.original.isBelowReorderLevel ? <span className="inline-flex items-center gap-1 text-warning"><AlertTriangle className="h-3.5 w-3.5" /> Below reorder</span> : "Healthy" },
  ], []);
  return <div className="mt-4 space-y-4"><Card className="flex flex-wrap items-end gap-3 p-4">
    <FilterSelect label="Warehouse" value={warehouseCode} onChange={setWarehouseCode}>{warehouses?.map((w) => <SelectItem key={w.warehouseCode} value={w.warehouseCode}>{w.warehouseName}</SelectItem>)}</FilterSelect>
    <FilterSelect label="Item" value={itemCode} onChange={setItemCode} className="w-56">{products?.map((p) => <SelectItem key={p.itemCode} value={p.itemCode}>{p.itemName} ({p.itemCode})</SelectItem>)}</FilterSelect>
    <FilterSelect label="Category" value={categoryId} onChange={setCategoryId}>{categories?.map((c) => <SelectItem key={c.categoryId} value={String(c.categoryId)}>{c.categoryName}</SelectItem>)}</FilterSelect>
    <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} /> Available only</label>
    <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" checked={onlyBelow} onChange={(e) => setOnlyBelow(e.target.checked)} /> Below reorder only</label>
  </Card>{query.data && <Summaries values={[{ label: "Total Quantity", value: qty(query.data.totalQuantity) }, { label: "Total Stock Value", value: formatMoney(query.data.totalStockValue), tone: "text-primary" }, { label: "Generated", value: formatDateTime(query.data.generatedAt) }, { label: "Items", value: qty(query.data.items.length) }]} />}
  <DataTable columns={columns} data={query.data?.items ?? []} isLoading={query.isLoading} error={query.isError ? errorText(query.error) : null} onRetry={query.refetch} searchPlaceholder="Search stock items…" emptyTitle="No stock matches these filters" pageSize={15} /></div>;
}

export function StockMovementsTab({ branchCode, warehouseBranchCode, fromDate, toDate, datesValid }: ReportScope) {
  const [warehouseCode, setWarehouseCode] = useState(""); const [itemCode, setItemCode] = useState(""); const [movementType, setMovementType] = useState(""); const [referenceType, setReferenceType] = useState(""); const [referenceNo, setReferenceNo] = useState("");
  const { data: products } = useProducts(); const { data: warehouses } = useWarehouses(warehouseBranchCode);
  const query = useStockMovementReport({ fromDate, toDate, branchCode, warehouseCode: warehouseCode || undefined, itemCode: itemCode || undefined, movementType: movementType ? movementType as StockMovementType : undefined, referenceType: referenceType ? referenceType as StockReferenceType : undefined, referenceNo: referenceNo || undefined }, datesValid);
  const columns = useMemo<ColumnDef<StockMovementReportLine>[]>(() => [
    { accessorKey: "createdAt", header: "Date", cell: ({ row }) => formatDateTime(row.original.createdAt) }, { accessorKey: "itemName", header: "Item", cell: ({ row }) => <div>{row.original.itemName || row.original.itemCode}<p className="text-xs text-muted-foreground">{row.original.itemCode}</p></div> },
    { accessorKey: "movementType", header: "Movement" }, { accessorKey: "referenceType", header: "Reference", cell: ({ row }) => `${row.original.referenceType}${row.original.referenceNo ? ` · ${row.original.referenceNo}` : ""}` },
    { accessorKey: "warehouseCode", header: "Location", cell: ({ row }) => `${row.original.branchCode} / ${row.original.warehouseCode}` }, { accessorKey: "quantity", header: "Qty", cell: ({ row }) => <span className="num">{qty(row.original.quantity)}</span> },
    { accessorKey: "newQty", header: "New Qty", cell: ({ row }) => <span className="num">{qty(row.original.newQty)}</span> }, { accessorKey: "movementValue", header: "Value", cell: ({ row }) => <span className="num">{formatMoney(row.original.movementValue)}</span> },
  ], []);
  return <div className="mt-4 space-y-4"><Card className="flex flex-wrap items-end gap-3 p-4"><FilterSelect label="Warehouse" value={warehouseCode} onChange={setWarehouseCode}>{warehouses?.map((w) => <SelectItem key={w.warehouseCode} value={w.warehouseCode}>{w.warehouseName}</SelectItem>)}</FilterSelect><FilterSelect label="Item" value={itemCode} onChange={setItemCode} className="w-56">{products?.map((p) => <SelectItem key={p.itemCode} value={p.itemCode}>{p.itemName} ({p.itemCode})</SelectItem>)}</FilterSelect><FilterSelect label="Movement" value={movementType} onChange={setMovementType}>{StockMovementType.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</FilterSelect><FilterSelect label="Reference Type" value={referenceType} onChange={setReferenceType}>{StockReferenceType.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</FilterSelect><div className="space-y-1.5"><Label className="text-xs">Reference No.</Label><Input className="w-44" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} /></div></Card>
  {query.data && <Summaries values={[{ label: "Total In Qty", value: qty(query.data.totalInQty), tone: "text-success" }, { label: "Total Out Qty", value: qty(query.data.totalOutQty), tone: "text-warning" }, { label: "Total In Value", value: formatMoney(query.data.totalInValue) }, { label: "Total Out Value", value: formatMoney(query.data.totalOutValue) }]} />}<DataTable columns={columns} data={query.data?.movements ?? []} isLoading={query.isLoading} error={query.isError ? errorText(query.error) : null} onRetry={query.refetch} searchPlaceholder="Search movements…" emptyTitle="No stock movements in this range" pageSize={15} /></div>;
}

export function PurchasesTab({ branchCode, fromDate, toDate, datesValid }: ReportScope) {
  const [vendorId, setVendorId] = useState(""); const [itemCode, setItemCode] = useState(""); const [status, setStatus] = useState(""); const { data: vendors } = useVendors(true); const { data: products } = useProducts();
  const query = usePurchaseReport({ fromDate, toDate, branchCode, vendorId: vendorId ? Number(vendorId) : undefined, itemCode: itemCode || undefined, status: status ? status as PurchaseOrderStatus : undefined }, datesValid);
  const columns = useMemo<ColumnDef<PurchaseReportLine>[]>(() => [
    { accessorKey: "poNo", header: "PO No." }, { accessorKey: "poDate", header: "Date", cell: ({ row }) => formatDate(row.original.poDate) }, { accessorKey: "vendorName", header: "Vendor", cell: ({ row }) => row.original.vendorName || "—" },
    { accessorKey: "itemName", header: "Item", cell: ({ row }) => `${row.original.itemName || row.original.itemCode} (${row.original.itemCode})` }, { accessorKey: "poStatus", header: "Status" },
    { accessorKey: "orderedQty", header: "Ordered", cell: ({ row }) => qty(row.original.orderedQty) }, { accessorKey: "receivedQty", header: "Received", cell: ({ row }) => qty(row.original.receivedQty) }, { accessorKey: "outstandingQty", header: "Outstanding", cell: ({ row }) => qty(row.original.outstandingQty) },
    { accessorKey: "netPurchaseValue", header: "Net Value", cell: ({ row }) => <span className="num font-semibold">{formatMoney(row.original.netPurchaseValue)}</span> },
  ], []);
  return <div className="mt-4 space-y-4"><Card className="flex flex-wrap items-end gap-3 p-4"><FilterSelect label="Vendor" value={vendorId} onChange={setVendorId}>{vendors?.map((v) => <SelectItem key={v.vendorId} value={String(v.vendorId)}>{v.vendorName}</SelectItem>)}</FilterSelect><FilterSelect label="Item" value={itemCode} onChange={setItemCode} className="w-56">{products?.map((p) => <SelectItem key={p.itemCode} value={p.itemCode}>{p.itemName} ({p.itemCode})</SelectItem>)}</FilterSelect><FilterSelect label="Status" value={status} onChange={setStatus}>{PurchaseOrderStatus.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</FilterSelect></Card>{query.data && <Summaries values={[{ label: "Ordered Value", value: formatMoney(query.data.totalOrderedValue) }, { label: "Received Value", value: formatMoney(query.data.totalReceivedValue) }, { label: "Return Value", value: formatMoney(query.data.totalReturnValue) }, { label: "Net Purchase Value", value: formatMoney(query.data.totalNetPurchaseValue), tone: "text-primary" }]} />}<DataTable columns={columns} data={query.data?.items ?? []} isLoading={query.isLoading} error={query.isError ? errorText(query.error) : null} onRetry={query.refetch} searchPlaceholder="Search purchases…" emptyTitle="No purchases in this range" pageSize={15} /></div>;
}

export function ExpensesTab({ branchCode, fromDate, toDate, datesValid }: ReportScope) {
  const [categoryId, setCategoryId] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const { data: categories } = useExpenseCategories();
  const query = useExpenseReport({ fromDate, toDate, branchCode, categoryId: categoryId ? Number(categoryId) : undefined, paidBy: paidBy || undefined }, datesValid);
  const columns = useMemo<ColumnDef<ExpenseReportLine>[]>(() => [
    { accessorKey: "expenseDate", header: "Date", cell: ({ row }) => formatDate(row.original.expenseDate) },
    { accessorKey: "categoryName", header: "Category", cell: ({ row }) => row.original.categoryName || "-" },
    { accessorKey: "description", header: "Description", cell: ({ row }) => row.original.description || "-" },
    { accessorKey: "branchName", header: "Branch", cell: ({ row }) => row.original.branchName || row.original.branchCode || "-" },
    { accessorKey: "paidByName", header: "Paid By", cell: ({ row }) => row.original.paidByName || row.original.paidBy || "-" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="num font-semibold">{formatMoney(row.original.amount)}</span> },
  ], []);
  return <div className="mt-4 space-y-4">
    <Card className="flex flex-wrap items-end gap-3 p-4">
      <FilterSelect label="Category" value={categoryId} onChange={setCategoryId}>{categories?.map((c) => <SelectItem key={c.categoryId} value={String(c.categoryId)}>{c.categoryName}</SelectItem>)}</FilterSelect>
      <div className="space-y-1.5"><Label className="text-xs">Paid By</Label><Input className="w-48" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} placeholder="User/code" /></div>
    </Card>
    {query.data && <><Summaries values={[{ label: "Expense Count", value: qty(query.data.totalExpenseCount) }, { label: "Total Expenses", value: formatMoney(query.data.totalExpenseAmount), tone: "text-warning" }]} />
      {query.data.categorySummary.length > 0 && <Card className="flex flex-wrap gap-x-6 gap-y-2 p-4 text-sm">{query.data.categorySummary.map((category) => <span key={category.categoryId ?? category.categoryName}><span className="font-medium">{category.categoryName || "Uncategorized"}</span>: {formatMoney(category.totalAmount)} ({category.expenseCount})</span>)}</Card>}
    </>}
    <DataTable columns={columns} data={query.data?.expenses ?? []} isLoading={query.isLoading} error={query.isError ? errorText(query.error) : null} onRetry={query.refetch} searchPlaceholder="Search expenses..." emptyTitle="No expenses in this range" pageSize={15} />
  </div>;
}

export function ProfitTab({ branchCode, fromDate, toDate, datesValid }: ReportScope) {
  const query = useProfitReport({ fromDate, toDate, branchCode }, datesValid);
  if (query.isLoading) return <div className="mt-4"><Card className="h-40 animate-pulse" /></div>;
  if (query.isError) return <div className="mt-4"><ErrorState message={errorText(query.error)} onRetry={query.refetch} /></div>;
  if (!query.data) return <div className="mt-4"><ErrorState message="No profit data is available for this range." /></div>;
  const data = query.data;
  return <div className="mt-4 space-y-4"><Summaries values={[{ label: "Gross Sales (Excl. Tax)", value: formatMoney(data.grossSalesExcludingTax) }, { label: "Net Revenue", value: formatMoney(data.netRevenue), tone: "text-primary" }, { label: "Cost of Goods Sold", value: formatMoney(data.netCostOfGoodsSold) }, { label: "Gross Profit", value: formatMoney(data.grossProfit), tone: "text-success" }, { label: "Expenses", value: formatMoney(data.expenseTotal), tone: "text-warning" }, { label: "Net Profit", value: formatMoney(data.netProfit), tone: data.netProfit >= 0 ? "text-success" : "text-destructive" }, { label: "Gross Margin", value: `${qty(data.grossProfitMarginPercentage)}%` }, { label: "Returns / Discounts", value: `${formatMoney(data.salesReturnTotal)} / ${formatMoney(data.discountTotal)}` }]} /><Card className="grid gap-3 p-5 text-sm sm:grid-cols-2"><div className="row flex justify-between"><span>Sold cost</span><strong>{formatMoney(data.soldCost)}</strong></div><div className="flex justify-between"><span>Returned cost</span><strong>{formatMoney(data.returnedCost)}</strong></div></Card></div>;
}
