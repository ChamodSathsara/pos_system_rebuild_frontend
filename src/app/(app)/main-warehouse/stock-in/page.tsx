"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ProductSelector } from "@/components/shared/product-selector";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProducts } from "@/hooks/use-catalog";
import { useCreateCentralStockReceipt } from "@/hooks/use-stock";
import { useWarehouses } from "@/hooks/use-organization";
import { useAuthStore } from "@/store/auth-store";
import { centralStockReceiptsApi } from "@/lib/api";
import { formatMoney, formatNumber } from "@/lib/format";
import type { CentralStockReceipt } from "@/types";

type ReceiptLineDraft = { itemCode: string; quantity: string; unitCost: string; sellingPrice: string; expiryDate: string };
const today = () => new Date().toISOString().slice(0, 10);
const blankLine = (): ReceiptLineDraft => ({ itemCode: "", quantity: "", unitCost: "", sellingPrice: "", expiryDate: "" });

export default function CentralStockInPage() {
  const user = useAuthStore((state) => state.user);
  const isInventoryClerk = user?.roleName === "InventoryClerk";
  const products = useProducts({ isActive: true });
  const warehousesQuery = useWarehouses();
  const mutation = useCreateCentralStockReceipt();
  const centralWarehouses = (warehousesQuery.data ?? []).filter((warehouse) => warehouse.isCentralWarehouse && warehouse.isActive);
  const [warehouseCode, setWarehouseCode] = useState(user?.warehouseCode ?? "");
  const [receiptDate, setReceiptDate] = useState(today());
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<ReceiptLineDraft[]>([blankLine()]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receipt, setReceipt] = useState<CentralStockReceipt | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const setLine = (index: number, patch: Partial<ReceiptLineDraft>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  const clearForm = () => { setReceiptDate(today()); setReferenceNo(""); setRemarks(""); setLines([blankLine()]); };
  const validate = () => {
    if (!warehouseCode) return "Select the Central Warehouse that will receive this stock.";
    if (!receiptDate) return "Receipt date is required.";
    if (!lines.length || lines.some((line) => !line.itemCode || !Number.isInteger(Number(line.quantity)) || Number(line.quantity) <= 0 || line.unitCost === "" || Number(line.unitCost) < 0 || line.sellingPrice === "" || Number(line.sellingPrice) < 0)) return "Each line needs a product, a positive whole-number quantity, and valid unit and selling prices.";
    if (new Set(lines.map((line) => line.itemCode)).size !== lines.length) return "A product can only be added once in the same stock receipt.";
    return null;
  };
  const startSubmit = () => { const message = validate(); if (message) { toast.error("Stock receipt needs attention", { description: message }); return; } setConfirmOpen(true); };
  const submit = () => mutation.mutate({ warehouseCode, receiptDate, referenceNo: referenceNo.trim() || null, remarks: remarks.trim() || null, items: lines.map((line) => ({ itemCode: line.itemCode, quantity: Number(line.quantity), unitCost: Number(line.unitCost), sellingPrice: Number(line.sellingPrice), expiryDate: line.expiryDate || null })) }, { onSuccess: (response) => { setConfirmOpen(false); setReceipt(response.data); clearForm(); toast.success("Central stock received", { description: `${response.data.receiptNo} was posted and inventory has been updated.` }); } });

  if (isInventoryClerk && !user?.warehouseCode) return <AssignmentError />;
  const selectedWarehouse = centralWarehouses.find((warehouse) => warehouse.warehouseCode === warehouseCode);
  const totalQuantity = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  return <div className="space-y-6">
    <PageHeader title="Central Stock In" description="Receive recurring stock directly into a Central Warehouse. The backend creates batches and updates inventory atomically." />
    <div className="max-w-6xl space-y-5 rounded-xl border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Central Warehouse *">{isInventoryClerk ? <Input value={selectedWarehouse ? `${selectedWarehouse.warehouseName} (${warehouseCode})` : warehouseCode} disabled /> : <Select value={warehouseCode} onValueChange={setWarehouseCode}><SelectTrigger><SelectValue placeholder="Select Central Warehouse" /></SelectTrigger><SelectContent>{centralWarehouses.map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={warehouse.warehouseCode}>{warehouse.warehouseName} ({warehouse.warehouseCode})</SelectItem>)}</SelectContent></Select>}</Field>
        <Field label="Receipt Date *"><Input type="date" value={receiptDate} onChange={(event) => setReceiptDate(event.target.value)} /></Field>
        <Field label="Reference Number"><Input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} placeholder="e.g. supplier delivery note" /></Field>
        <Field label="Remarks"><Input value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional receipt note" /></Field>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold">Items to receive</h2><p className="text-sm text-muted-foreground">Batch numbers are created automatically after this receipt is posted.</p></div><Button type="button" variant="outline" onClick={() => setLines((current) => [...current, blankLine()])}><Plus /> Add item</Button></div>
        <div className="hidden grid-cols-[minmax(220px,1.6fr)_110px_130px_130px_150px_38px] gap-2 px-1 text-xs font-medium text-muted-foreground lg:grid"><span>Product</span><span>Quantity</span><span>Unit Cost</span><span>Selling Price</span><span>Expiry Date</span><span /></div>
        {lines.map((line, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[minmax(220px,1.6fr)_110px_130px_130px_150px_38px] lg:items-start lg:border-0 lg:p-0">
          <ProductSelector products={(products.data ?? []).filter((product) => product.itemCode === line.itemCode || !lines.some((other, otherIndex) => otherIndex !== index && other.itemCode === product.itemCode))} value={line.itemCode} onChange={(itemCode) => setLine(index, { itemCode })} isLoading={products.isLoading} />
          <Input type="number" min="1" step="1" inputMode="numeric" placeholder="Quantity" value={line.quantity} onChange={(event) => setLine(index, { quantity: event.target.value })} />
          <Input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Unit cost" value={line.unitCost} onChange={(event) => setLine(index, { unitCost: event.target.value })} />
          <Input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Selling price" value={line.sellingPrice} onChange={(event) => setLine(index, { sellingPrice: event.target.value })} />
          <Input type="date" value={line.expiryDate} onChange={(event) => setLine(index, { expiryDate: event.target.value })} />
          <Button type="button" variant="ghost" size="icon" aria-label="Remove item" disabled={lines.length === 1 || mutation.isPending} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
        </div>)}
      </div>
      <div className="flex justify-end"><Button type="button" disabled={mutation.isPending} onClick={startSubmit}>{mutation.isPending ? "Saving receipt..." : "Review stock receipt"}</Button></div>
    </div>
    {receipt && <div className="max-w-6xl rounded-xl border border-success/30 bg-success/5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-success">Receipt {receipt.receiptNo} posted successfully.</p><p className="mt-1 text-sm text-muted-foreground">{formatNumber(receipt.totalQuantity)} units added to {receipt.warehouseName || receipt.warehouseCode} · {formatMoney(receipt.totalCost)}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setViewOpen(true)}>View Receipt</Button><Button onClick={() => void centralStockReceiptsApi.receiptPdf(receipt.receiptId, receipt.receiptNo)}>Print Receipt</Button></div></div></div>}
    <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Post Central Stock Receipt?" description={`This will add ${formatNumber(totalQuantity)} units to ${selectedWarehouse?.warehouseName || warehouseCode}. The backend will generate stock batches automatically.`} confirmLabel="Post Receipt" loading={mutation.isPending} onConfirm={submit} />
    <Sheet open={viewOpen} onOpenChange={setViewOpen}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>{receipt?.receiptNo || "Central Stock Receipt"}</SheetTitle></SheetHeader>{receipt && <div className="mt-5 space-y-4"><div className="grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm"><ReceiptDetail label="Warehouse" value={receipt.warehouseName || receipt.warehouseCode} /><ReceiptDetail label="Receipt date" value={receipt.receiptDate} /><ReceiptDetail label="Reference" value={receipt.referenceNo || "—"} /><ReceiptDetail label="Total cost" value={formatMoney(receipt.totalCost)} /></div>{receipt.items.map((item) => <div key={item.receiptLineId} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-3"><p className="font-medium">{item.itemName || item.itemCode}</p><p>{item.batchNo}</p></div><p className="mt-1 text-muted-foreground">Qty {formatNumber(item.quantity)} · Cost {formatMoney(item.unitCost)} · Selling {formatMoney(item.sellingPrice)}</p></div>)}<Button className="w-full" onClick={() => void centralStockReceiptsApi.receiptPdf(receipt.receiptId, receipt.receiptNo)}>Print Receipt</Button></div>}</SheetContent></Sheet>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function ReceiptDetail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 font-medium">{value}</p></div>; }
function AssignmentError() { return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h1 className="font-semibold text-destructive">Main Warehouse is not assigned.</h1><p className="mt-1 text-sm text-muted-foreground">Contact Admin before receiving Central Warehouse stock.</p></div>; }
