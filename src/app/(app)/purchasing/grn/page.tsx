"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { BranchFilter } from "@/components/shared/branch-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateGrn, useGrns, usePurchaseOrders, usePurchaseOrder } from "@/hooks/use-purchase";
import { useWarehouses } from "@/hooks/use-organization";
import { useEffectiveBranchCode } from "@/store/auth-store";
import { formatDate, formatMoney } from "@/lib/format";
import type { Grn } from "@/types";
import { toast } from "sonner";

function GrnPageInner() {
  const searchParams = useSearchParams();
  const prefillPoNo = searchParams.get("poNo") ?? undefined;

  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const { data, isLoading, isError, refetch } = useGrns({ branchCode });

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (prefillPoNo) setOpen(true);
  }, [prefillPoNo]);

  const columns = useMemo<ColumnDef<Grn>[]>(
    () => [
      { accessorKey: "grnNo", header: "GRN No." },
      { accessorKey: "poNo", header: "PO No." },
      { accessorKey: "vendorName", header: "Vendor", cell: ({ row }) => row.original.vendorName || row.original.vendorCode },
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
        description="Record stock received from vendors against purchase orders."
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
          batchNo: "",
          expiryDate: "",
        }));
      replace(remaining);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPO]);

  const onSubmit = form.handleSubmit((v) => {
    if (!v.poNo || !v.branchCode || !v.warehouseCode) {
      toast.error("PO, branch, and warehouse are required.");
      return;
    }
    const items = v.items.filter((i) => i.itemCode && i.quantity && i.unitCost).map((i) => ({
      itemCode: i.itemCode,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
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
        onSuccess: () => {
          onOpenChange(false);
          form.reset({ poNo: "", branchCode: defaultBranch ?? "", warehouseCode: "", invoiceNo: "", invoiceDate: "", remarks: "", items: [] });
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
              {receivablePOs.map((po) => <SelectItem key={po.poNo} value={po.poNo}>{po.poNo} — {po.vendorName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Warehouse *</Label>
          <Select value={form.watch("warehouseCode")} onValueChange={(v) => form.setValue("warehouseCode", v)}>
            <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
            <SelectContent>
              {warehouses?.map((w) => <SelectItem key={w.warehouseCode} value={w.warehouseCode}>{w.warehouseName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Invoice No.</Label><Input {...form.register("invoiceNo")} /></div>
        <div className="space-y-1.5"><Label>Invoice Date</Label><Input type="date" {...form.register("invoiceDate")} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Remarks</Label><Input {...form.register("remarks")} /></div>
      </div>

      {fields.length > 0 && (
        <div className="space-y-2">
          <Label>Items to Receive</Label>
          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border p-2">
                <div className="col-span-4 text-xs">
                  <p className="font-medium text-foreground truncate">{field.itemName || field.itemCode}</p>
                  <p className="text-muted-foreground">{field.itemCode}</p>
                </div>
                <Input placeholder="Qty" type="number" step="0.01" className="col-span-2" {...form.register(`items.${idx}.quantity` as const)} />
                <Input placeholder="Unit cost" type="number" step="0.01" className="col-span-2" {...form.register(`items.${idx}.unitCost` as const)} />
                <Input placeholder="Batch no." className="col-span-2" {...form.register(`items.${idx}.batchNo` as const)} />
                <Input placeholder="Expiry" type="date" className="col-span-2" {...form.register(`items.${idx}.expiryDate` as const)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </FormDialog>
  );
}
