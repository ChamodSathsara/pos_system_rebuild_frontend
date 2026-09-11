"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCentralStockReceipts, useStockInventories } from "@/hooks/use-stock";
import { useWarehouses } from "@/hooks/use-organization";
import { useAuthStore } from "@/store/auth-store";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { CentralStockReceipt, StockInventory } from "@/types";

export default function CentralInventoryReportsPage() {
  const user = useAuthStore((state) => state.user);
  const isInventoryClerk = user?.roleName === "InventoryClerk";
  const warehouses = useWarehouses();
  const central = (warehouses.data ?? []).filter((warehouse) => warehouse.isCentralWarehouse && warehouse.isActive);
  const [warehouseCode, setWarehouseCode] = useState(user?.warehouseCode ?? "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const inventory = useStockInventories({ warehouseCode }, !!warehouseCode);
  const receipts = useCentralStockReceipts({ warehouseCode, fromDate: fromDate || undefined, toDate: toDate || undefined }, !!warehouseCode);
  const totalQuantity = (inventory.data ?? []).reduce((sum, item) => sum + item.currentQty, 0);
  const receiptQuantity = (receipts.data ?? []).reduce((sum, receipt) => sum + receipt.totalQuantity, 0);
  const receiptCost = (receipts.data ?? []).reduce((sum, receipt) => sum + receipt.totalCost, 0);
  const columns = useMemo<ColumnDef<StockInventory>[]>(() => [
    { accessorKey: "itemCode", header: "Item Code" },
    { accessorKey: "itemName", header: "Item" },
    { accessorKey: "currentQty", header: "Quantity on Hand", cell: ({ row }) => <span className="num font-medium">{formatNumber(row.original.currentQty)}</span> },
    { accessorKey: "lastUpdated", header: "Last Updated", cell: ({ row }) => formatDate(row.original.lastUpdated) },
  ], []);
  if (isInventoryClerk && !user?.warehouseCode) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h1 className="font-semibold text-destructive">Main Warehouse is not assigned.</h1><p className="mt-1 text-sm text-muted-foreground">Contact Admin to access inventory reports.</p></div>;
  return <div className="space-y-6"><PageHeader title="Central Inventory Reports" description="Live Central Warehouse stock and stock receipt totals. Use the date range to analyse receipt activity." />
    <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4"><div className="w-64 space-y-1"><Label>Central Warehouse</Label>{isInventoryClerk ? <Input value={central.find((warehouse) => warehouse.warehouseCode === warehouseCode)?.warehouseName || warehouseCode} disabled /> : <Select value={warehouseCode} onValueChange={setWarehouseCode}><SelectTrigger><SelectValue placeholder="Select Central Warehouse" /></SelectTrigger><SelectContent>{central.map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={warehouse.warehouseCode}>{warehouse.warehouseName} ({warehouse.warehouseCode})</SelectItem>)}</SelectContent></Select>}</div><div className="w-44 space-y-1"><Label>From</Label><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></div><div className="w-44 space-y-1"><Label>To</Label><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Stock Items" value={formatNumber((inventory.data ?? []).length)} /><Metric label="Quantity on Hand" value={formatNumber(totalQuantity)} /><Metric label="Stock Receipts" value={formatNumber((receipts.data ?? []).length)} /><Metric label="Receipt Value" value={formatMoney(receiptCost)} /></div>
    <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Received quantity for the selected period</p><p className="mt-1 text-2xl font-bold">{formatNumber(receiptQuantity)}</p></div>
    <DataTable columns={columns} data={inventory.data ?? []} isLoading={inventory.isLoading} error={inventory.isError ? "Current Central Warehouse inventory could not be loaded." : null} onRetry={inventory.refetch} searchPlaceholder="Search current Central Warehouse stock..." emptyTitle="No stock found in this Central Warehouse" />
  </div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
