"use client";

import { useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCentralStockReceipts } from "@/hooks/use-stock";
import { useWarehouses } from "@/hooks/use-organization";
import { useAuthStore } from "@/store/auth-store";
import { centralStockReceiptsApi } from "@/lib/api";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { CentralStockReceipt } from "@/types";

export default function StockReceiptHistoryPage() {
  const user = useAuthStore((state) => state.user);
  const isInventoryClerk = user?.roleName === "InventoryClerk";
  const warehouses = useWarehouses();
  const central = (warehouses.data ?? []).filter((warehouse) => warehouse.isCentralWarehouse && warehouse.isActive);
  const [warehouseCode, setWarehouseCode] = useState(user?.warehouseCode ?? "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [detail, setDetail] = useState<CentralStockReceipt | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const history = useCentralStockReceipts({ warehouseCode, fromDate: fromDate || undefined, toDate: toDate || undefined }, !!warehouseCode);
  const openDetail = async (summary: CentralStockReceipt) => {
    setLoadingDetail(true);
    try { setDetail(await centralStockReceiptsApi.get(summary.receiptId)); }
    catch { toast.error("Receipt details could not be loaded.", { description: "Refresh the page and try again." }); }
    finally { setLoadingDetail(false); }
  };
  const columns = useMemo<ColumnDef<CentralStockReceipt>[]>(() => [
    { accessorKey: "receiptNo", header: "Receipt No." },
    { accessorKey: "receiptDate", header: "Receipt Date", cell: ({ row }) => formatDate(row.original.receiptDate) },
    { accessorKey: "warehouseName", header: "Warehouse", cell: ({ row }) => row.original.warehouseName || row.original.warehouseCode },
    { accessorKey: "referenceNo", header: "Reference No.", cell: ({ row }) => row.original.referenceNo || "—" },
    { accessorKey: "totalQuantity", header: "Total Quantity", cell: ({ row }) => <span className="num">{formatNumber(row.original.totalQuantity)}</span> },
    { accessorKey: "totalCost", header: "Total Cost", cell: ({ row }) => <span className="num">{formatMoney(row.original.totalCost)}</span> },
    { accessorKey: "receivedBy", header: "Received By", cell: ({ row }) => row.original.receivedBy || "—" },
    { id: "actions", header: "", cell: ({ row }) => <div className="flex justify-end gap-1"><Button size="xs" variant="outline" disabled={loadingDetail} onClick={() => void openDetail(row.original)}><Eye /> View</Button><Button size="xs" variant="outline" onClick={() => void centralStockReceiptsApi.receiptPdf(row.original.receiptId, row.original.receiptNo)}><Download /> Print</Button></div> },
  ], [loadingDetail]);
  if (isInventoryClerk && !user?.warehouseCode) return <AssignmentError />;
  return <div className="space-y-6"><PageHeader title="Stock Receipt History" description="Review Central Warehouse stock receipts, their generated batches, and printable receipt documents." />
    <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4">
      <div className="w-64 space-y-1"><Label>Central Warehouse</Label>{isInventoryClerk ? <Input value={central.find((warehouse) => warehouse.warehouseCode === warehouseCode)?.warehouseName || warehouseCode} disabled /> : <Select value={warehouseCode} onValueChange={setWarehouseCode}><SelectTrigger><SelectValue placeholder="Select Central Warehouse" /></SelectTrigger><SelectContent>{central.map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={warehouse.warehouseCode}>{warehouse.warehouseName} ({warehouse.warehouseCode})</SelectItem>)}</SelectContent></Select>}</div>
      <div className="w-44 space-y-1"><Label>From</Label><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></div>
      <div className="w-44 space-y-1"><Label>To</Label><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div>
    </div>
    <DataTable columns={columns} data={history.data ?? []} isLoading={history.isLoading} error={history.isError ? "Stock receipt history could not be loaded." : null} onRetry={history.refetch} searchPlaceholder="Search receipt, warehouse or reference..." emptyTitle="No Central Warehouse stock receipts found" />
    <Sheet open={!!detail || loadingDetail} onOpenChange={(open) => !open && setDetail(null)}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>{detail?.receiptNo || "Loading receipt..."}</SheetTitle></SheetHeader>{detail && <div className="mt-5 space-y-5"><div className="grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm"><Detail label="Warehouse" value={detail.warehouseName || detail.warehouseCode} /><Detail label="Receipt Date" value={formatDate(detail.receiptDate)} /><Detail label="Reference" value={detail.referenceNo || "—"} /><Detail label="Received By" value={detail.receivedBy || "—"} /><Detail label="Total Quantity" value={formatNumber(detail.totalQuantity)} /><Detail label="Total Cost" value={formatMoney(detail.totalCost)} /></div><div className="space-y-2"><h2 className="font-semibold">Generated Batches</h2>{detail.items.map((item) => <div key={item.receiptLineId} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-3"><p className="font-medium">{item.itemName || item.itemCode}</p><p className="text-muted-foreground">{item.batchNo}</p></div><p className="mt-1 text-muted-foreground">Qty {formatNumber(item.quantity)} · Cost {formatMoney(item.unitCost)} · Selling {formatMoney(item.sellingPrice)}</p></div>)}</div>{detail.remarks && <p className="rounded-lg border p-3 text-sm text-muted-foreground">{detail.remarks}</p>}<Button className="w-full" onClick={() => void centralStockReceiptsApi.receiptPdf(detail.receiptId, detail.receiptNo)}><Download /> Print Receipt</Button></div>}</SheetContent></Sheet>
  </div>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 font-medium">{value}</p></div>; }
function AssignmentError() { return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h1 className="font-semibold text-destructive">Main Warehouse is not assigned.</h1><p className="mt-1 text-sm text-muted-foreground">Contact Admin to view Central Warehouse receipts.</p></div>; }
