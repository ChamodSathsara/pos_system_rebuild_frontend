"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranches, useCreateWarehouse, useDeleteWarehouse, useUpdateWarehouse, useWarehouses } from "@/hooks/use-organization";
import type { Warehouse } from "@/types";
import { toast } from "sonner";

export default function WarehousesPage() {
  const { data, isLoading, isError, refetch } = useWarehouses();
  const { data: branches } = useBranches();
  const createM = useCreateWarehouse();
  const updateM = useUpdateWarehouse();
  const deleteM = useDeleteWarehouse();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState<Warehouse | null>(null);
  const form = useForm({ defaultValues: { warehouseName: "", address: "", branchCode: "", isActive: true, isCentralWarehouse: false, parentWarehouseCode: "" } });
  const isCentralWarehouse = form.watch("isCentralWarehouse");

  const openCreate = () => { setEditing(null); form.reset({ warehouseName: "", address: "", branchCode: "", isActive: true, isCentralWarehouse: false, parentWarehouseCode: "" }); setOpen(true); };
  const openEdit = (w: Warehouse) => {
    setEditing(w);
    form.reset({ warehouseName: w.warehouseName, address: w.address ?? "", branchCode: w.branchCode ?? "", isActive: w.isActive, isCentralWarehouse: w.isCentralWarehouse ?? false, parentWarehouseCode: w.parentWarehouseCode ?? "" });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    if (!v.warehouseName.trim()) {
      form.setError("warehouseName", { message: "Warehouse name is required." });
      toast.error("Warehouse name is required.");
      return;
    }
    if (!v.isCentralWarehouse && !v.branchCode) {
      form.setError("branchCode", { message: "Select the branch that owns this warehouse." });
      toast.error("Branch is required.", { description: "Every normal warehouse must belong to a branch." });
      return;
    }
    if (!v.isCentralWarehouse && !v.parentWarehouseCode) {
      form.setError("parentWarehouseCode", { message: "Select the Main Warehouse that supplies this branch warehouse." });
      toast.error("Parent Main Warehouse is required.");
      return;
    }
    const body = { warehouseName: v.warehouseName.trim(), address: v.address || null, branchCode: v.isCentralWarehouse ? null : v.branchCode, isActive: v.isActive, isCentralWarehouse: v.isCentralWarehouse, parentWarehouseCode: v.isCentralWarehouse ? null : v.parentWarehouseCode };
    if (editing) updateM.mutate({ code: editing.warehouseCode, body }, { onSuccess: () => setOpen(false) });
    else createM.mutate(body, { onSuccess: () => setOpen(false) });
  });

  const columns = useMemo<ColumnDef<Warehouse>[]>(
    () => [
      { accessorKey: "warehouseCode", header: "Code" },
      { accessorKey: "warehouseName", header: "Warehouse Name" },
      { accessorKey: "branchCode", header: "Branch", cell: ({ row }) => row.original.branchCode || "—" },
      { accessorKey: "isCentralWarehouse", header: "Type", cell: ({ row }) => <Badge variant={row.original.isCentralWarehouse ? "default" : "outline"}>{row.original.isCentralWarehouse ? "Main" : "Branch"}</Badge> },
      { accessorKey: "parentWarehouseCode", header: "Parent", cell: ({ row }) => row.original.parentWarehouseCode || "—" },
      { accessorKey: "isActive", header: "Status", cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "secondary"}>{row.original.isActive ? "Active" : "Inactive"}</Badge> },
      { id: "actions", header: "", cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(row.original)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      )},
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouses" description="Manage shared Main Warehouses and branch-owned storage locations." actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New Warehouse</Button>} />
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search warehouses…" emptyTitle="No warehouses yet" />
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Warehouse" : "New Warehouse"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Warehouse Name *</Label><Input {...form.register("warehouseName")} />{form.formState.errors.warehouseName && <p className="text-xs text-destructive">{form.formState.errors.warehouseName.message}</p>}</div>
          {!isCentralWarehouse && <div className="space-y-1.5">
            <Label>Branch *</Label>
            <Select value={form.watch("branchCode")} onValueChange={(v) => { form.setValue("branchCode", v); form.clearErrors("branchCode"); }}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>{branches?.map((b) => <SelectItem key={b.branchCode} value={b.branchCode}>{b.branchName}</SelectItem>)}</SelectContent>
            </Select>
            {form.formState.errors.branchCode && <p className="text-xs text-destructive">{form.formState.errors.branchCode.message}</p>}
          </div>}
          <div className="flex items-center gap-2 pt-6"><Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} /><Label>Active</Label></div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={isCentralWarehouse} onCheckedChange={(v) => { form.setValue("isCentralWarehouse", v); form.clearErrors(["branchCode", "parentWarehouseCode"]); if (v) { form.setValue("branchCode", ""); form.setValue("parentWarehouseCode", ""); } }} /><Label>Main / Central Warehouse</Label></div>
          {!isCentralWarehouse && <div className="space-y-1.5">
            <Label>Parent Main Warehouse *</Label>
            <Select value={form.watch("parentWarehouseCode")} onValueChange={(v) => { form.setValue("parentWarehouseCode", v); form.clearErrors("parentWarehouseCode"); }}>
              <SelectTrigger><SelectValue placeholder="Select main warehouse" /></SelectTrigger>
              <SelectContent>{data?.filter((w) => w.isCentralWarehouse && w.warehouseCode !== editing?.warehouseCode).map((w) => <SelectItem key={w.warehouseCode} value={w.warehouseCode}>{w.warehouseName} ({w.warehouseCode})</SelectItem>)}</SelectContent>
            </Select>
            {form.formState.errors.parentWarehouseCode && <p className="text-xs text-destructive">{form.formState.errors.parentWarehouseCode.message}</p>}
          </div>}
          <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input {...form.register("address")} /></div>
        </div>
      </FormDialog>
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.warehouseName}?`} variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.warehouseCode, { onSuccess: () => setDeleting(null) })} />
    </div>
  );
}
