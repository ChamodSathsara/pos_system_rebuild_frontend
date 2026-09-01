"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { BranchFilter } from "@/components/shared/branch-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDamageItem, useDamageItems, useUpdateDamageItem } from "@/hooks/use-stock";
import { useEffectiveBranchCode } from "@/store/auth-store";
import { formatDate, formatMoney } from "@/lib/format";
import { DamageItemStatus, type DamageItem } from "@/types";
import { toast } from "sonner";

const NEXT_STATUS: Record<DamageItemStatus, DamageItemStatus[]> = {
  Reported: ["Reviewed", "Rejected"],
  Reviewed: ["Approved", "Rejected"],
  Approved: ["Disposed", "Rejected"],
  Disposed: [],
  Rejected: [],
};

export default function DamageItemsPage() {
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const { data, isLoading, isError, refetch } = useDamageItems({ branchCode });

  const [open, setOpen] = useState(false);
  const createM = useCreateDamageItem();
  const updateM = useUpdateDamageItem();

  const form = useForm({ defaultValues: { itemCode: "", branchCode: "", warehouseCode: "", quantity: "", costAmount: "", reason: "", damageDate: "" } });

  const openCreate = () => {
    form.reset({ itemCode: "", branchCode: branchCode ?? "", warehouseCode: "", quantity: "", costAmount: "", reason: "", damageDate: "" });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    if (!v.itemCode || !v.branchCode || !v.quantity) {
      toast.error("Item code, branch, and quantity are required.");
      return;
    }
    createM.mutate(
      {
        itemCode: v.itemCode,
        branchCode: v.branchCode,
        warehouseCode: v.warehouseCode || null,
        quantity: Number(v.quantity),
        costAmount: v.costAmount ? Number(v.costAmount) : null,
        reason: v.reason || null,
        damageDate: v.damageDate || null,
      },
      { onSuccess: () => setOpen(false) }
    );
  });

  const advanceStatus = (item: DamageItem, status: DamageItemStatus) => {
    updateM.mutate({
      id: item.damageId,
      body: {
        itemCode: item.itemCode ?? "",
        branchCode: item.branchCode ?? "",
        warehouseCode: item.warehouseCode,
        quantity: item.quantity ?? 0,
        costAmount: item.costAmount,
        reason: item.reason,
        damageDate: item.damageDate,
        status,
      },
    });
  };

  const columns = useMemo<ColumnDef<DamageItem>[]>(
    () => [
      { accessorKey: "itemName", header: "Item", cell: ({ row }) => row.original.itemName || row.original.itemCode },
      { accessorKey: "branchName", header: "Branch", cell: ({ row }) => row.original.branchName || row.original.branchCode },
      { accessorKey: "quantity", header: "Qty", cell: ({ row }) => <span className="num">{row.original.quantity}</span> },
      { accessorKey: "costAmount", header: "Cost", cell: ({ row }) => <span className="num">{formatMoney(row.original.costAmount)}</span> },
      { accessorKey: "reason", header: "Reason", cell: ({ row }) => row.original.reason || "—" },
      { accessorKey: "damageDate", header: "Date", cell: ({ row }) => formatDate(row.original.damageDate) },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const nexts = NEXT_STATUS[row.original.status] ?? [];
          if (nexts.length === 0) return null;
          return (
            <div className="flex justify-end gap-1">
              {nexts.map((s) => (
                <Button key={s} size="xs" variant={s === "Rejected" ? "outline" : "secondary"} onClick={() => advanceStatus(row.original, s)}>
                  {s}
                </Button>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Damage Items"
        description="Report and review damaged, expired, or written-off stock."
        actions={
          <div className="flex items-center gap-3">
            <BranchFilter value={branchFilter} onChange={setBranchFilter} />
            <Button onClick={openCreate}><Plus className="h-4 w-4" /> Report Damage</Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        error={isError ? "Failed to load." : null}
        onRetry={refetch}
        searchPlaceholder="Search by item…"
        emptyTitle="No damage reports"
        emptyDescription="Nothing has been reported as damaged yet."
      />

      <FormDialog open={open} onOpenChange={setOpen} title="Report Damage" onSubmit={onSubmit} isSubmitting={createM.isPending} submitLabel="Submit Report">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Item Code *</Label><Input placeholder="e.g. ITM00012" {...form.register("itemCode")} /></div>
          <div className="space-y-1.5"><Label>Branch Code *</Label><Input {...form.register("branchCode")} /></div>
          <div className="space-y-1.5"><Label>Warehouse Code</Label><Input {...form.register("warehouseCode")} /></div>
          <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" step="0.01" {...form.register("quantity")} /></div>
          <div className="space-y-1.5"><Label>Cost Amount</Label><Input type="number" step="0.01" {...form.register("costAmount")} /></div>
          <div className="space-y-1.5"><Label>Damage Date</Label><Input type="date" {...form.register("damageDate")} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Reason</Label><Textarea rows={2} {...form.register("reason")} /></div>
        </div>
      </FormDialog>
    </div>
  );
}
