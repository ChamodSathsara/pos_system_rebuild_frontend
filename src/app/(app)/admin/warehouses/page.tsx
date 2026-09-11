"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
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
  const reset = (warehouse?: Warehouse) => form.reset(warehouse ? { warehouseName: warehouse.warehouseName, address: warehouse.address ?? "", branchCode: warehouse.branchCode ?? "", isActive: warehouse.isActive, isCentralWarehouse: warehouse.isCentralWarehouse, parentWarehouseCode: warehouse.parentWarehouseCode ?? "" } : { warehouseName: "", address: "", branchCode: "", isActive: true, isCentralWarehouse: false, parentWarehouseCode: "" });
  const onSubmit = form.handleSubmit((values) => {
    if (!values.warehouseName.trim()) { form.setError("warehouseName", { message: "Warehouse name is required." }); toast.error("Warehouse name is required."); return; }
    if (!values.isCentralWarehouse && !values.branchCode) { form.setError("branchCode", { message: "Select the branch that owns this warehouse." }); toast.error("Branch is required.", { description: "Every branch warehouse must belong to a branch." }); return; }
    if (!values.isCentralWarehouse && !values.parentWarehouseCode) { form.setError("parentWarehouseCode", { message: "Select the Main Warehouse that supplies this branch warehouse." }); toast.error("Parent Main Warehouse is required."); return; }
    const body = { warehouseName: values.warehouseName.trim(), address: values.address || null, branchCode: values.isCentralWarehouse ? null : values.branchCode, isActive: values.isActive, isCentralWarehouse: values.isCentralWarehouse, parentWarehouseCode: values.isCentralWarehouse ? null : values.parentWarehouseCode };
    if (editing) updateM.mutate({ code: editing.warehouseCode, body }, { onSuccess: () => setOpen(false) }); else createM.mutate(body, { onSuccess: () => setOpen(false) });
  });
  const columns = useMemo<ColumnDef<Warehouse>[]>(() => [
    { accessorKey: "warehouseCode", header: "Code" },
    { accessorKey: "warehouseName", header: "Warehouse Name" },
    { id: "branchName", header: "Branch", cell: ({ row }) => branches?.find((branch) => branch.branchCode === row.original.branchCode)?.branchName || row.original.branchCode || "Not assigned" },
    { accessorKey: "isCentralWarehouse", header: "Type", cell: ({ row }) => <Badge variant={row.original.isCentralWarehouse ? "default" : "outline"}>{row.original.isCentralWarehouse ? "Main" : "Branch"}</Badge> },
    { id: "parentName", header: "Parent Main Warehouse", cell: ({ row }) => data?.find((warehouse) => warehouse.warehouseCode === row.original.parentWarehouseCode)?.warehouseName || row.original.parentWarehouseCode || "Not assigned" },
    { accessorKey: "isActive", header: "Status", cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "secondary"}>{row.original.isActive ? "Active" : "Inactive"}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => <div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(row.original); reset(row.original); setOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(row.original)}><Trash2 className="h-4 w-4" /></Button></div> },
  ], [branches, data]);

  return <div className="space-y-6">
    <PageHeader title="Warehouses" description="Manage shared Main Warehouses and branch-owned storage locations." actions={<Button onClick={() => { setEditing(null); reset(); setOpen(true); }}><Plus className="h-4 w-4" /> New Warehouse</Button>} />
    <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search warehouses..." emptyTitle="No warehouses yet" />
    <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Warehouse" : "New Warehouse"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Warehouse Name *</Label><Input {...form.register("warehouseName")} />{form.formState.errors.warehouseName && <p className="text-xs text-destructive">{form.formState.errors.warehouseName.message}</p>}</div>
        {!isCentralWarehouse && <div className="space-y-1.5"><Label>Branch *</Label><Select value={form.watch("branchCode")} onValueChange={(value) => { form.setValue("branchCode", value); form.clearErrors("branchCode"); }}><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger><SelectContent>{branches?.map((branch) => <SelectItem key={branch.branchCode} value={branch.branchCode}>{branch.branchName}</SelectItem>)}</SelectContent></Select>{form.formState.errors.branchCode && <p className="text-xs text-destructive">{form.formState.errors.branchCode.message}</p>}</div>}
        <div className="flex items-center gap-2 pt-6"><Switch checked={form.watch("isActive")} onCheckedChange={(value) => form.setValue("isActive", value)} /><Label>Active</Label></div>
        <div className="flex items-center gap-2 pt-6"><Switch checked={isCentralWarehouse} onCheckedChange={(value) => { form.setValue("isCentralWarehouse", value); form.clearErrors(["branchCode", "parentWarehouseCode"]); if (value) { form.setValue("branchCode", ""); form.setValue("parentWarehouseCode", ""); } }} /><Label>Main / Central Warehouse</Label></div>
        {!isCentralWarehouse && <div className="space-y-1.5"><Label>Parent Main Warehouse *</Label><Select value={form.watch("parentWarehouseCode")} onValueChange={(value) => { form.setValue("parentWarehouseCode", value); form.clearErrors("parentWarehouseCode"); }}><SelectTrigger><SelectValue placeholder="Select main warehouse" /></SelectTrigger><SelectContent>{data?.filter((warehouse) => warehouse.isCentralWarehouse && warehouse.warehouseCode !== editing?.warehouseCode).map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={warehouse.warehouseCode}>{warehouse.warehouseName} ({warehouse.warehouseCode})</SelectItem>)}</SelectContent></Select>{form.formState.errors.parentWarehouseCode && <p className="text-xs text-destructive">{form.formState.errors.parentWarehouseCode.message}</p>}</div>}
        <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input {...form.register("address")} /></div>
      </div>
    </FormDialog>
    <ConfirmDialog open={!!deleting} onOpenChange={(nextOpen) => !nextOpen && setDeleting(null)} title={"Delete " + (deleting?.warehouseName || "warehouse") + "?"} variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.warehouseCode, { onSuccess: () => setDeleting(null) })} />
  </div>;
}
