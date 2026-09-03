"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { BranchFilter } from "@/components/shared/branch-filter";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useDailySalesReport, useItemWiseSalesReport, useSalesReturnReport, useSalesSummaryReport } from "@/hooks/use-misc";
import { reportsApi, type ReportQuery } from "@/lib/api";
import { useEffectiveBranchCode } from "@/store/auth-store";
import { useAuthStore } from "@/store/auth-store";
import { canAccessReports } from "@/lib/permissions";
import { CurrentStockTab, ExpensesTab, ProfitTab, PurchasesTab, StockMovementsTab } from "@/components/reports/operational-report-tabs";
import { formatDate, formatMoney, formatNumber, toDateOnly } from "@/lib/format";
import type { DailySalesReportRow, ItemWiseSalesReportLine, SalesReturnReportLine } from "@/types";
import { Receipt, ShoppingBag, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { fromDate: toDateOnly(from), toDate: toDateOnly(to) };
}

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const operationalBranchCode = user?.roleName === "Branch_Manager" ? undefined : branchFilter;
  const [range, setRange] = useState(defaultRange());
  const datesValid = !!range.fromDate && !!range.toDate && range.toDate >= range.fromDate;
  const query: ReportQuery = { ...range, branchCode };

  const [exporting, setExporting] = useState(false);
  const doExport = async (kind: "daily" | "summary" | "item-wise" | "returns", format: "pdf" | "excel") => {
    setExporting(true);
    try {
      await reportsApi.download(kind, format, query);
    } catch {
      toast.error("Could not generate the export.");
    } finally {
      setExporting(false);
    }
  };

  if (!canAccessReports(user?.roleName)) {
    return <ErrorState message="Access denied: cashiers do not have report access." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Sales, stock, purchasing, expenses, and profitability insights."
        actions={<BranchFilter value={branchFilter} onChange={setBranchFilter} />}
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={range.fromDate} onChange={(e) => setRange((r) => ({ ...r, fromDate: e.target.value }))} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" min={range.fromDate} value={range.toDate} onChange={(e) => setRange((r) => ({ ...r, toDate: e.target.value }))} className="w-40" />
          </div>
          {!datesValid && <p className="pb-2 text-sm font-medium text-destructive">To date must be on or after from date.</p>}
        </div>
      </Card>

      <Tabs defaultValue="summary">
        <div className="flex items-center justify-between">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="items">Item-wise</TabsTrigger>
            <TabsTrigger value="returns">Returns</TabsTrigger>
            <TabsTrigger value="current-stock">Current Stock</TabsTrigger>
            <TabsTrigger value="movements">Stock Movements</TabsTrigger>
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="profit">Profit</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary"><SummaryTab query={query} onExport={doExport} exporting={exporting} /></TabsContent>
        <TabsContent value="daily"><DailyTab query={query} onExport={doExport} exporting={exporting} /></TabsContent>
        <TabsContent value="items"><ItemWiseTab query={query} onExport={doExport} exporting={exporting} /></TabsContent>
        <TabsContent value="returns"><ReturnsTab query={query} onExport={doExport} exporting={exporting} /></TabsContent>
        <TabsContent value="current-stock"><CurrentStockTab branchCode={operationalBranchCode} warehouseBranchCode={branchCode} /></TabsContent>
        <TabsContent value="movements"><StockMovementsTab branchCode={operationalBranchCode} warehouseBranchCode={branchCode} {...range} datesValid={datesValid} /></TabsContent>
        <TabsContent value="purchases"><PurchasesTab branchCode={operationalBranchCode} {...range} datesValid={datesValid} /></TabsContent>
        <TabsContent value="expenses"><ExpensesTab branchCode={operationalBranchCode} {...range} datesValid={datesValid} /></TabsContent>
        <TabsContent value="profit"><ProfitTab branchCode={operationalBranchCode} {...range} datesValid={datesValid} /></TabsContent>
      </Tabs>
    </div>
  );
}

type ReportKind = "daily" | "summary" | "item-wise" | "returns";

function ExportButtons<K extends ReportKind>({ kind, onExport, exporting }: { kind: K; onExport: (k: K, f: "pdf" | "excel") => void; exporting: boolean }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={exporting} onClick={() => onExport(kind, "pdf")}><FileText className="h-3.5 w-3.5" /> PDF</Button>
      <Button size="sm" variant="outline" disabled={exporting} onClick={() => onExport(kind, "excel")}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
    </div>
  );
}

function SummaryTab({ query, onExport, exporting }: { query: ReportQuery; onExport: (k: "summary", f: "pdf" | "excel") => void; exporting: boolean }) {
  const { data, isLoading, isError, refetch } = useSalesSummaryReport(query);
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end"><ExportButtons kind="summary" onExport={onExport} exporting={exporting} /></div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : isError ? (
        <ErrorState message="Could not load the summary report." onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Invoices" value={formatNumber(data?.totalInvoices)} icon={Receipt} tone="primary" />
          <StatCard label="Qty Sold" value={formatNumber(data?.totalQuantitySold)} icon={ShoppingBag} tone="info" />
          <StatCard label="Gross Sales" value={formatMoney(data?.grossSales)} icon={TrendingUp} tone="success" isMoney />
          <StatCard label="Discounts" value={formatMoney(data?.discountTotal)} icon={TrendingDown} tone="warning" isMoney />
          <StatCard label="Returns" value={formatMoney(data?.returnsTotal)} icon={TrendingDown} tone="destructive" isMoney />
          <StatCard label="Net Sales" value={formatMoney(data?.netSales)} icon={TrendingUp} tone="success" isMoney />
        </div>
      )}
    </div>
  );
}

function DailyTab({ query, onExport, exporting }: { query: ReportQuery; onExport: (k: "daily", f: "pdf" | "excel") => void; exporting: boolean }) {
  const { data, isLoading, isError, refetch } = useDailySalesReport(query);

  const columns = useMemo<ColumnDef<DailySalesReportRow>[]>(
    () => [
      { accessorKey: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
      { accessorKey: "invoiceCount", header: "Invoices", cell: ({ row }) => <span className="num">{row.original.invoiceCount}</span> },
      { accessorKey: "grossSales", header: "Gross", cell: ({ row }) => <span className="num">{formatMoney(row.original.grossSales)}</span> },
      { accessorKey: "discountTotal", header: "Discounts", cell: ({ row }) => <span className="num">{formatMoney(row.original.discountTotal)}</span> },
      { accessorKey: "taxTotal", header: "Tax", cell: ({ row }) => <span className="num">{formatMoney(row.original.taxTotal)}</span> },
      { accessorKey: "returnsTotal", header: "Returns", cell: ({ row }) => <span className="num">{formatMoney(row.original.returnsTotal)}</span> },
      { accessorKey: "netSales", header: "Net Sales", cell: ({ row }) => <span className="num font-semibold">{formatMoney(row.original.netSales)}</span> },
    ],
    []
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end"><ExportButtons kind="daily" onExport={onExport} exporting={exporting} /></div>
      <DataTable columns={columns} data={data?.days ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search by date…" emptyTitle="No sales in this range" pageSize={15} />
      {data && (
        <Card className="flex justify-end gap-6 p-3 text-sm">
          <span>Total Invoices: <span className="num font-semibold">{data.total.invoiceCount}</span></span>
          <span>Total Net Sales: <span className="num font-semibold">{formatMoney(data.total.netSales)}</span></span>
        </Card>
      )}
    </div>
  );
}

function ItemWiseTab({ query, onExport, exporting }: { query: ReportQuery; onExport: (k: "item-wise", f: "pdf" | "excel") => void; exporting: boolean }) {
  const { data, isLoading, isError, refetch } = useItemWiseSalesReport(query);

  const columns = useMemo<ColumnDef<ItemWiseSalesReportLine>[]>(
    () => [
      { accessorKey: "itemName", header: "Item", cell: ({ row }) => <div><p className="font-medium">{row.original.itemName}</p><p className="text-xs text-muted-foreground">{row.original.itemCode}</p></div> },
      { accessorKey: "quantitySold", header: "Qty Sold", cell: ({ row }) => <span className="num">{row.original.quantitySold}</span> },
      { accessorKey: "sellingAmount", header: "Sales", cell: ({ row }) => <span className="num">{formatMoney(row.original.sellingAmount)}</span> },
      { accessorKey: "discountAmount", header: "Discount", cell: ({ row }) => <span className="num">{formatMoney(row.original.discountAmount)}</span> },
      { accessorKey: "returnQuantity", header: "Returned", cell: ({ row }) => <span className="num">{row.original.returnQuantity}</span> },
      { accessorKey: "netSalesAmount", header: "Net", cell: ({ row }) => <span className="num font-semibold">{formatMoney(row.original.netSalesAmount)}</span> },
    ],
    []
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end"><ExportButtons kind="item-wise" onExport={onExport} exporting={exporting} /></div>
      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search item…" emptyTitle="No item sales in this range" pageSize={15} />
    </div>
  );
}

function ReturnsTab({ query, onExport, exporting }: { query: ReportQuery; onExport: (k: "returns", f: "pdf" | "excel") => void; exporting: boolean }) {
  const { data, isLoading, isError, refetch } = useSalesReturnReport(query);

  const columns = useMemo<ColumnDef<SalesReturnReportLine>[]>(
    () => [
      { accessorKey: "returnNo", header: "Return No." },
      { accessorKey: "invoiceNo", header: "Invoice" },
      { accessorKey: "returnDate", header: "Date", cell: ({ row }) => formatDate(row.original.returnDate) },
      { accessorKey: "customerName", header: "Customer", cell: ({ row }) => row.original.customerName || "Walk-in" },
      { accessorKey: "reason", header: "Reason", cell: ({ row }) => row.original.reason || "—" },
      { accessorKey: "totalReturnAmount", header: "Amount", cell: ({ row }) => <span className="num">{formatMoney(row.original.totalReturnAmount)}</span> },
    ],
    []
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        {data && (
          <p className="text-sm text-muted-foreground">
            <span className="num font-semibold text-foreground">{data.totalReturns}</span> returns totaling{" "}
            <span className="num font-semibold text-foreground">{formatMoney(data.totalReturnAmount)}</span>
          </p>
        )}
        <ExportButtons kind="returns" onExport={onExport} exporting={exporting} />
      </div>
      <DataTable columns={columns} data={data?.returns ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search return or invoice…" emptyTitle="No returns in this range" pageSize={15} />
    </div>
  );
}
