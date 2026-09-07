"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { CircleDollarSign, History, PackagePlus, RotateCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { BranchFilter } from "@/components/shared/branch-filter";
import { FormDialog } from "@/components/shared/form-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateStockBatch, useStockBatches, useReconcileStock, useStockInventories, useStockMovements, useUpdateBatchSellingPrice } from "@/hooks/use-stock";
import { useEffectiveBranchCode } from "@/store/auth-store";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { StockBatch, StockInventory } from "@/types";
import { toast } from "sonner";

export default function StockLevelsPage() {
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const [onlyLow, setOnlyLow] = useState(false);
  const [detailFor, setDetailFor] = useState<StockInventory | null>(null);

  const { data, isLoading, isError, refetch } = useStockInventories({ branchCode, onlyBelowReorderLevel: onlyLow || undefined });

  const columns = useMemo<ColumnDef<StockInventory>[]>(
    () => [
      { accessorKey: "itemCode", header: "Item Code" },
      { accessorKey: "itemName", header: "Item", cell: ({ row }) => row.original.itemName || "—" },
      { accessorKey: "branchCode", header: "Branch" },
      { accessorKey: "warehouseCode", header: "Warehouse" },
      { accessorKey: "currentQty", header: "Qty on Hand", cell: ({ row }) => <span className="num font-semibold">{row.original.currentQty}</span> },
      { accessorKey: "lastUpdated", header: "Last Updated", cell: ({ row }) => formatDateTime(row.original.lastUpdated) },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => setDetailFor(row.original)}>
            View Batches
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Levels"
        description="Live stock quantities per item, branch, and warehouse."
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={onlyLow} onCheckedChange={setOnlyLow} /> Below reorder only
            </label>
            <BranchFilter value={branchFilter} onChange={setBranchFilter} />
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        error={isError ? "Failed to load stock." : null}
        onRetry={refetch}
        searchPlaceholder="Search by item…"
        emptyTitle="No stock records found"
        pageSize={12}
      />

      <StockDetailSheet stock={detailFor} onClose={() => setDetailFor(null)} />
    </div>
  );
}

function StockDetailSheet({ stock, onClose }: { stock: StockInventory | null; onClose: () => void }) {
  const { data: batches, isLoading } = useStockBatches(stock?.stockId);
  const { data: movements } = useStockMovements({ stockId: stock?.stockId });
  const reconcileM = useReconcileStock();
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [priceFor, setPriceFor] = useState<StockBatch | null>(null);

  return (
    <>
      <Sheet open={!!stock} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{stock?.itemName || stock?.itemCode}</SheetTitle>
            <p className="text-xs text-muted-foreground">{stock?.branchCode} · {stock?.warehouseCode} · On hand: <span className="num font-semibold text-foreground">{stock?.currentQty}</span></p>
          </SheetHeader>

          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => setReceiveOpen(true)}>
              <PackagePlus className="h-4 w-4" /> Receive Stock
            </Button>
            <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4" /> Movement History
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={reconcileM.isPending}
              onClick={() => stock && reconcileM.mutate(stock.stockId)}
            >
              <RotateCw className="h-4 w-4" /> Reconcile
            </Button>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Batches</p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !batches || batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No batches received yet.</p>
            ) : (
              <div className="space-y-2">
                {batches.map((b) => (
                  <div key={b.batchId} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{b.batchNo}</p>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                      <span>Received: <span className="num text-foreground">{b.receivedQty}</span></span>
                      <span>Available: <span className="num text-foreground">{b.availableQty}</span></span>
                      <span>Cost: <span className="num text-foreground">{formatMoney(b.unitCost)}</span></span>
                      <span>Selling: <span className="num text-foreground">{b.sellingPrice == null ? "Not set" : formatMoney(b.sellingPrice)}</span></span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex gap-3"><span>Received {formatDate(b.receivedDate)}</span>{b.expiryDate && <span>Expires {formatDate(b.expiryDate)}</span>}</div>
                      <Button type="button" size="xs" variant="outline" onClick={() => setPriceFor(b)}><CircleDollarSign className="h-3.5 w-3.5" /> Change Selling Price</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {stock && <ReceiveStockDialog stockId={stock.stockId} open={receiveOpen} onOpenChange={setReceiveOpen} />}
      {priceFor && <ChangeSellingPriceDialog key={priceFor.batchId} batch={priceFor} onClose={() => setPriceFor(null)} />}

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="flex h-full w-full flex-col overflow-hidden sm:max-w-2xl">
          <SheetHeader className="shrink-0"><SheetTitle>Stock Movement History</SheetTitle></SheetHeader>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Prev → New</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(movements ?? []).map((m) => (
                  <TableRow key={m.movementId}>
                    <TableCell className="whitespace-nowrap text-xs">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell><Badge variant="outline">{m.movementType}</Badge></TableCell>
                    <TableCell className="text-xs">{m.referenceType}{m.referenceNo ? ` · ${m.referenceNo}` : ""}</TableCell>
                    <TableCell className={`num ${m.qty >= 0 ? "text-success" : "text-destructive"}`}>{m.qty >= 0 ? `+${m.qty}` : m.qty}</TableCell>
                    <TableCell className="num text-xs">{m.previousQty} → {m.newQty}</TableCell>
                    <TableCell className="text-xs">{m.createdBy}</TableCell>
                  </TableRow>
                ))}
                {(!movements || movements.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No movements recorded.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ChangeSellingPriceDialog({ batch, onClose }: { batch: StockBatch; onClose: () => void }) {
  const updatePrice = useUpdateBatchSellingPrice();
  const form = useForm({ defaultValues: { sellingPrice: batch.sellingPrice == null ? "" : String(batch.sellingPrice) } });
  const submit = form.handleSubmit((values) => {
    updatePrice.mutate(
      { batchId: batch.batchId, body: { sellingPrice: Number(values.sellingPrice) } },
      { onSuccess: onClose }
    );
  });

  return <FormDialog open onOpenChange={(open) => !open && onClose()} title={`Change selling price — ${batch.batchNo}`} description="This price applies only to the selected stock batch." onSubmit={submit} isSubmitting={updatePrice.isPending} submitLabel="Update Price">
    <div className="space-y-1.5">
      <Label htmlFor="batch-selling-price">Selling Price *</Label>
      <Input id="batch-selling-price" type="number" min="0.01" step="0.01" autoFocus {...form.register("sellingPrice", { required: "Selling price is required.", validate: (value) => Number(value) > 0 || "Selling price must be greater than 0." })} />
      {form.formState.errors.sellingPrice && <p className="text-xs text-destructive">{form.formState.errors.sellingPrice.message}</p>}
      <p className="text-xs text-muted-foreground">Current price: {batch.sellingPrice == null ? "Not set" : formatMoney(batch.sellingPrice)}</p>
    </div>
  </FormDialog>;
}

function ReceiveStockDialog({ stockId, open, onOpenChange }: { stockId: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  const createM = useCreateStockBatch();
  const form = useForm({ defaultValues: { batchNo: "", receivedQty: "", unitCost: "", expiryDate: "", remarks: "" } });

  const onSubmit = form.handleSubmit((v) => {
    if (!v.batchNo || !v.receivedQty || !v.unitCost) {
      toast.error("Batch number, quantity, and unit cost are required.");
      return;
    }
    createM.mutate(
      {
        stockId,
        batchNo: v.batchNo,
        receivedQty: Number(v.receivedQty),
        unitCost: Number(v.unitCost),
        expiryDate: v.expiryDate || null,
        remarks: v.remarks || null,
      },
      { onSuccess: () => { onOpenChange(false); form.reset(); } }
    );
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Receive Stock" description="Creates a new batch and adjusts stock on hand." onSubmit={onSubmit} isSubmitting={createM.isPending} submitLabel="Receive">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Batch No *</Label><Input {...form.register("batchNo")} /></div>
        <div className="space-y-1.5"><Label>Received Qty *</Label><Input type="number" step="0.01" {...form.register("receivedQty")} /></div>
        <div className="space-y-1.5"><Label>Unit Cost *</Label><Input type="number" step="0.01" {...form.register("unitCost")} /></div>
        <div className="space-y-1.5"><Label>Expiry Date</Label><Input type="date" {...form.register("expiryDate")} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Remarks</Label><Input {...form.register("remarks")} /></div>
      </div>
    </FormDialog>
  );
}
