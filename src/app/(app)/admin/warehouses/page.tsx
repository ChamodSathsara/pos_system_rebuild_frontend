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
  const form = useForm({ defaultValues: { warehouseCode: "", warehouseName: "", address: "", branchCode: "", isActive: true } });

  const openCreate = () => { setEditing(null); form.reset({ warehouseCode: "", warehouseName: "", address: "", branchCode: "", isActive: true }); setOpen(true); };
  const openEdit = (w: Warehouse) => {
    setEditing(w);
    form.reset({ warehouseCode: w.warehouseCode, warehouseName: w.warehouseName, address: w.address ?? "", branchCode: w.branchCode ?? "", isActive: w.isActive });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    const body = { warehouseName: v.warehouseName, address: v.address || null, branchCode: v.branchCode || null, isActive: v.isActive };
    if (editing) updateM.mutate({ code: editing.warehouseCode, body }, { onSuccess: () => setOpen(false) });
    else {
      if (!v.warehouseCode) { toast.error("Warehouse code is required."); return; }
      createM.mutate({ warehouseCode: v.warehouseCode, ...body }, { onSuccess: () => setOpen(false) });
    }
  });

  const columns = useMemo<ColumnDef<Warehouse>[]>(
    () => [
      { accessorKey: "warehouseCode", header: "Code" },
      { accessorKey: "warehouseName", header: "Warehouse Name" },
      { accessorKey: "branchCode", header: "Branch", cell: ({ row }) => row.original.branchCode || "—" },
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
      <PageHeader title="Warehouses" description="Storage locations within each branch." actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New Warehouse</Button>} />
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search warehouses…" emptyTitle="No warehouses yet" />
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Warehouse" : "New Warehouse"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          {!editing && <div className="space-y-1.5"><Label>Warehouse Code *</Label><Input {...form.register("warehouseCode")} /></div>}
          <div className={`space-y-1.5 ${editing ? "col-span-2" : ""}`}><Label>Warehouse Name *</Label><Input {...form.register("warehouseName")} /></div>
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={form.watch("branchCode")} onValueChange={(v) => form.setValue("branchCode", v)}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>{branches?.map((b) => <SelectItem key={b.branchCode} value={b.branchCode}>{b.branchName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} /><Label>Active</Label></div>
          <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input {...form.register("address")} /></div>
        </div>
      </FormDialog>
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.warehouseName}?`} variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.warehouseCode, { onSuccess: () => setDeleting(null) })} />
    </div>
  );
}
