"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { BranchFilter } from "@/components/shared/branch-filter";
import { ProductSelector } from "@/components/shared/product-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDamageItem, useDamageItems, useUpdateDamageItem } from "@/hooks/use-stock";
import { useProducts } from "@/hooks/use-catalog";
import { useBranches, useWarehouses } from "@/hooks/use-organization";
import { useAuthStore, useEffectiveBranchCode } from "@/store/auth-store";
import { isBranchScoped } from "@/lib/permissions";
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
  const user = useAuthStore((state) => state.user);
  const branchScoped = isBranchScoped(user?.roleName);
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const { data, isLoading, isError, refetch } = useDamageItems({ branchCode });

  const [open, setOpen] = useState(false);
  const createM = useCreateDamageItem();
  const updateM = useUpdateDamageItem();

  const form = useForm({ defaultValues: { itemCode: "", branchCode: "", warehouseCode: "", quantity: "", costAmount: "", reason: "", damageDate: "" } });
  const selectedItem = useWatch({ control: form.control, name: "itemCode" });
  const selectedBranch = useWatch({ control: form.control, name: "branchCode" });
  const selectedWarehouse = useWatch({ control: form.control, name: "warehouseCode" });
  const { data: products, isLoading: productsLoading } = useProducts({ isActive: true });
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses(selectedBranch || undefined);
  const activeWarehouses = (warehouses ?? []).filter((warehouse) => warehouse.isActive && warehouse.branchCode === selectedBranch);

  const openCreate = () => {
    form.reset({ itemCode: "", branchCode: branchCode ?? "", warehouseCode: "", quantity: "", costAmount: "", reason: "", damageDate: "" });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    if (!v.itemCode || !v.branchCode || !v.quantity) {
      toast.error("Item, branch, and quantity are required.");
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
          <div className="space-y-1.5">
            <Label>Item *</Label>
            <ProductSelector products={products ?? []} value={selectedItem} onChange={(value) => form.setValue("itemCode", value, { shouldDirty: true })} isLoading={productsLoading} />
          </div>
          <div className="space-y-1.5">
            <Label>Branch *</Label>
            <Select value={selectedBranch} onValueChange={(value) => { form.setValue("branchCode", value, { shouldDirty: true }); form.setValue("warehouseCode", ""); }} disabled={branchScoped || branchesLoading}>
              <SelectTrigger><SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select branch"} /></SelectTrigger>
              <SelectContent>{branches?.map((branch) => <SelectItem key={branch.branchCode} value={branch.branchCode}>{branch.branchName} ({branch.branchCode})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <Select value={selectedWarehouse} onValueChange={(value) => form.setValue("warehouseCode", value, { shouldDirty: true })} disabled={!selectedBranch || warehousesLoading}>
              <SelectTrigger><SelectValue placeholder={!selectedBranch ? "Select branch first" : warehousesLoading ? "Loading warehouses..." : "Select warehouse"} /></SelectTrigger>
              <SelectContent>{activeWarehouses.map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={warehouse.warehouseCode}>{warehouse.warehouseName} ({warehouse.warehouseCode})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" step="0.01" {...form.register("quantity")} /></div>
          <div className="space-y-1.5"><Label>Cost Amount</Label><Input type="number" step="0.01" {...form.register("costAmount")} /></div>
          <div className="space-y-1.5"><Label>Damage Date</Label><Input type="date" {...form.register("damageDate")} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Reason</Label><Textarea rows={2} {...form.register("reason")} /></div>
        </div>
      </FormDialog>
    </div>
  );
}
