"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { BranchFilter } from "@/components/shared/branch-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateGrn, useGrns, usePurchaseOrders, usePurchaseOrder } from "@/hooks/use-purchase";
import { useStockTransfers } from "@/hooks/use-stock-transfer";
import { useWarehouses } from "@/hooks/use-organization";
import { useEffectiveBranchCode } from "@/store/auth-store";
import { formatDate, formatMoney } from "@/lib/format";
import type { Grn } from "@/types";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

function GrnPageInner() {
  const searchParams = useSearchParams();
  const prefillPoNo = searchParams.get("poNo") ?? undefined;

  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const { data, isLoading, isError, refetch } = useGrns({ branchCode });

  const [open, setOpen] = useState(!!prefillPoNo);

  const columns = useMemo<ColumnDef<Grn>[]>(
    () => [
      { accessorKey: "grnNo", header: "GRN No." },
      { accessorKey: "poNo", header: "PO No." },
      {
        id: "source",
        header: "Source",
        cell: ({ row }) => {
          const grn = row.original;
          const isInternal = !!grn.isInternalTransfer && !!grn.sourceWarehouseCode && grn.vendorId == null;
          return isInternal
            ? `Central Warehouse: ${grn.sourceWarehouseName || grn.sourceWarehouseCode}`
            : grn.vendorName || grn.vendorCode || "—";
        },
      },
      { accessorKey: "branchCode", header: "Branch" },
      { accessorKey: "grnDate", header: "Date", cell: ({ row }) => formatDate(row.original.grnDate) },
      { accessorKey: "totalAmount", header: "Total", cell: ({ row }) => <span className="num">{formatMoney(row.original.totalAmount)}</span> },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Received (GRN)"
        description="Record stock received from vendors or Central Warehouses against purchase orders."
        actions={
          <div className="flex items-center gap-2">
            <BranchFilter value={branchFilter} onChange={setBranchFilter} />
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New GRN</Button>
          </div>
        }
      />

      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search GRN or PO number…" emptyTitle="No GRNs recorded yet" />

      <CreateGrnDialog open={open} onOpenChange={setOpen} defaultBranch={branchCode} prefillPoNo={prefillPoNo} />
    </div>
  );
}

export default function GrnPage() {
  return (
    <Suspense>
      <GrnPageInner />
    </Suspense>
  );
}

interface LineForm {
  itemCode: string;
  itemName?: string;
  quantity: string;
  unitCost: string;
  sellingPrice: string;
  batchNo: string;
  expiryDate: string;
}
interface FormValues {
  poNo: string;
  branchCode: string;
  warehouseCode: string;
  invoiceNo: string;
  invoiceDate: string;
  remarks: string;
  items: LineForm[];
}

function CreateGrnDialog({
  open,
  onOpenChange,
  defaultBranch,
  prefillPoNo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultBranch?: string;
  prefillPoNo?: string;
}) {
  const { data: openPOs } = usePurchaseOrders({ status: "Open", branchCode: defaultBranch });
  const { data: partialPOs } = usePurchaseOrders({ status: "PartiallyReceived", branchCode: defaultBranch });
  const receivablePOs = useMemo(() => [...(openPOs ?? []), ...(partialPOs ?? [])], [openPOs, partialPOs]);

  const form = useForm<FormValues>({
    defaultValues: { poNo: prefillPoNo ?? "", branchCode: defaultBranch ?? "", warehouseCode: "", invoiceNo: "", invoiceDate: "", remarks: "", items: [] },
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "items" });
  const selectedPoNo = form.watch("poNo");
  const { data: selectedPO } = usePurchaseOrder(selectedPoNo || undefined);
  const isInternalPO = !!selectedPO?.isInternalTransfer && !!selectedPO.sourceWarehouseCode && selectedPO.vendorId == null;
  const transferQuery = useStockTransfers({ sourceWarehouseCode: selectedPO?.sourceWarehouseCode ?? undefined }, isInternalPO && !!selectedPO?.transferRequestId);
  const linkedTransfer = transferQuery.data?.find((transfer) => transfer.transferRequestId === selectedPO?.transferRequestId);
  const internalDispatchCompleted = !isInternalPO || linkedTransfer?.status === "Dispatched";
  const { data: warehouses } = useWarehouses(form.watch("branchCode") || undefined);
  const createM = useCreateGrn();

  useEffect(() => {
    if (selectedPO) {
      form.setValue("branchCode", selectedPO.branchCode ?? defaultBranch ?? "");
      const remaining = selectedPO.items
        .filter((i) => (i.quantity ?? 0) - (i.receivedQuantity ?? 0) > 0)
        .map((i) => ({
          itemCode: i.itemCode ?? "",
          itemName: i.itemName ?? "",
          quantity: String((i.quantity ?? 0) - (i.receivedQuantity ?? 0)),
          unitCost: String(i.unitCost ?? ""),
          sellingPrice: String(i.sellingPrice ?? ""),
          batchNo: "",
          expiryDate: "",
        }));
      replace(remaining);
      if (isInternalPO && selectedPO.destinationWarehouseCode) form.setValue("warehouseCode", selectedPO.destinationWarehouseCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPO, isInternalPO]);

  const onSubmit = form.handleSubmit((v) => {
    if (!v.poNo || !v.branchCode || !v.warehouseCode) {
      toast.error("PO, branch, and warehouse are required.");
      return;
    }
    if (isInternalPO && !internalDispatchCompleted) { toast.error("Central Warehouse has not dispatched this PO yet."); return; }
    let hasSellingPriceError = false;
    v.items.forEach((item, index) => { if (!item.sellingPrice || !Number.isFinite(Number(item.sellingPrice)) || Number(item.sellingPrice) <= 0) { form.setError(`items.${index}.sellingPrice`, { message: "Selling price is required and must be greater than zero." }); hasSellingPriceError = true; } });
    if (hasSellingPriceError) { toast.error("Enter a valid selling price for every GRN item."); return; }
    const items = v.items.filter((i) => i.itemCode && i.quantity && i.unitCost).map((i) => ({
      itemCode: i.itemCode,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
      sellingPrice: Number(i.sellingPrice),
      batchNo: i.batchNo || null,
      expiryDate: i.expiryDate || null,
    }));
    if (items.length === 0) {
      toast.error("No items to receive.");
      return;
    }
    createM.mutate(
      { grnNo: null, poNo: v.poNo, branchCode: v.branchCode, warehouseCode: v.warehouseCode, invoiceNo: v.invoiceNo || null, invoiceDate: v.invoiceDate || null, remarks: v.remarks || null, items },
      {
        onSuccess: (saved) => {
          toast.success("GRN posted and batch selling prices saved.", { description: saved.items.map((item, index) => `${item.itemCode}: ${formatMoney(item.sellingPrice ?? Number(v.items[index]?.sellingPrice || 0))}`).join(" · ") });
          onOpenChange(false);
          form.reset({ poNo: "", branchCode: defaultBranch ?? "", warehouseCode: "", invoiceNo: "", invoiceDate: "", remarks: "", items: [] });
        },
        onError: (error: ApiError) => {
          if (error.status === 409 && /must dispatch/i.test(error.message)) toast.error("Central Warehouse has not dispatched this PO yet.");
          if (error.status === 409 && /selected destination warehouse/i.test(error.message)) { if (selectedPO?.destinationWarehouseCode) form.setValue("warehouseCode", selectedPO.destinationWarehouseCode); toast.error("This Internal PO must be received into its selected destination warehouse."); }
          if (error.status === 400 && /selling\s*price/i.test([error.message, ...(error.errors ?? [])].join(" "))) {
            const validationText = [error.message, ...(error.errors ?? [])].join(" ");
            const itemIndexes = [...validationText.matchAll(/items(?:\.|\[)(\d+)/gi)].map((match) => Number(match[1]));
            const indexesToMark = itemIndexes.length > 0 ? [...new Set(itemIndexes)] : v.items.map((_, index) => index);
            indexesToMark.forEach((index) => form.setError(`items.${index}.sellingPrice`, { message: "Enter a valid selling price." }));
          }
        },
      }
    );
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="New GRN" description="Select a purchase order to auto-fill outstanding lines." onSubmit={onSubmit} isSubmitting={createM.isPending} submitLabel="Post GRN" className="sm:max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Purchase Order *</Label>
          <Select value={form.watch("poNo")} onValueChange={(v) => form.setValue("poNo", v)}>
            <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
            <SelectContent>
              {receivablePOs.map((po) => {
                const internal = !!po.isInternalTransfer && !!po.sourceWarehouseCode && po.vendorId == null;
                return <SelectItem key={po.poNo} value={po.poNo}>{po.poNo} — {internal ? `Central Warehouse: ${po.sourceWarehouseName || po.sourceWarehouseCode}` : po.vendorName}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Warehouse *</Label>
          <Select value={form.watch("warehouseCode")} onValueChange={(v) => form.setValue("warehouseCode", v)} disabled={isInternalPO}>
            <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
            <SelectContent>
              {warehouses?.filter((warehouse) => !isInternalPO || warehouse.warehouseCode === selectedPO?.destinationWarehouseCode).map((w) => <SelectItem key={w.warehouseCode} value={w.warehouseCode}>{w.warehouseName} ({w.warehouseCode})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Invoice No.</Label><Input {...form.register("invoiceNo")} /></div>
        <div className="space-y-1.5"><Label>Invoice Date</Label><Input type="date" {...form.register("invoiceDate")} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Remarks</Label><Input {...form.register("remarks")} /></div>
      </div>

      {isInternalPO && <div className={`rounded-lg border p-3 text-sm ${internalDispatchCompleted ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}><p className="font-medium">Central Warehouse: {selectedPO.sourceWarehouseName || selectedPO.sourceWarehouseCode}</p><p className="mt-1 text-muted-foreground">{transferQuery.isLoading ? "Checking dispatch status..." : internalDispatchCompleted ? "Central dispatch completed. GRN can now be posted." : "Central Warehouse has not dispatched this PO yet."}</p></div>}

      {fields.length > 0 && (
        <div className="space-y-2">
          <Label>Items to Receive</Label>
          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border p-2">
                <div className="col-span-2 text-xs">
                  <p className="font-medium text-foreground truncate">{field.itemName || field.itemCode}</p>
                  <p className="text-muted-foreground">{field.itemCode}</p>
                </div>
                <Input placeholder="Qty" type="number" min="1" step="1" className="col-span-2" {...form.register(`items.${idx}.quantity` as const)} />
                <Input placeholder="Unit cost" type="number" step="0.01" className="col-span-2" {...form.register(`items.${idx}.unitCost` as const)} />
                <div className="col-span-2"><Input placeholder="Selling price *" type="number" min="0.01" step="0.01" aria-invalid={!!form.formState.errors.items?.[idx]?.sellingPrice} {...form.register(`items.${idx}.sellingPrice` as const)} />{form.formState.errors.items?.[idx]?.sellingPrice && <p className="mt-1 text-xs text-destructive">{form.formState.errors.items[idx]?.sellingPrice?.message}</p>}</div>
                <Input placeholder="Batch no. (auto)" className="col-span-2" {...form.register(`items.${idx}.batchNo` as const)} />
                <Input placeholder="Expiry" type="date" className="col-span-2" {...form.register(`items.${idx}.expiryDate` as const)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </FormDialog>
  );
}
