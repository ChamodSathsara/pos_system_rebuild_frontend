"use client";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ProductSelector } from "@/components/shared/product-selector";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/hooks/use-catalog";
import { useCreateDamageItem, useDamageItems } from "@/hooks/use-stock";
import { formatDate, formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import type { DamageItem } from "@/types";

const today = () => new Date().toISOString().slice(0, 10);
export default function CentralDamagePage() {
  const code = useAuthStore((state) => state.user?.warehouseCode) ?? ""; const history = useDamageItems({ warehouseCode: code }, !!code); const products = useProducts({ isActive: true }); const mutation = useCreateDamageItem(); const [open, setOpen] = useState(false); const [confirm, setConfirm] = useState(false);
  const form = useForm({ defaultValues: { itemCode: "", quantity: "", reason: "", damageDate: today() } }); const itemCode = useWatch({ control: form.control, name: "itemCode" });
  const columns = useMemo<ColumnDef<DamageItem>[]>(() => [{ accessorKey: "itemName", header: "Item", cell: ({ row }) => row.original.itemName || row.original.itemCode }, { id: "source", header: "Batch / Source Stock", cell: ({ row }) => row.original.batchNo || (row.original.batchId ? `Batch #${row.original.batchId}` : row.original.stockId ? `Stock #${row.original.stockId}` : "—") }, { accessorKey: "quantity", header: "Qty" }, { accessorKey: "costAmount", header: "Calculated Cost", cell: ({ row }) => formatMoney(row.original.costAmount) }, { accessorKey: "reason", header: "Reason", cell: ({ row }) => row.original.reason || "—" }, { accessorKey: "damageDate", header: "Date", cell: ({ row }) => formatDate(row.original.damageDate) }, { id: "reporter", header: "Reporter", cell: ({ row }) => row.original.reportedByName || row.original.reportedBy || "—" }, { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> }], []);
  if (!code) return <AssignmentError />;
  const save = () => { const value = form.getValues(); mutation.mutate({ itemCode: value.itemCode, branchCode: null, warehouseCode: code, quantity: Number(value.quantity), costAmount: null, reason: value.reason.trim() || null, damageDate: value.damageDate || null }, { onSuccess: () => { setConfirm(false); setOpen(false); form.reset({ itemCode: "", quantity: "", reason: "", damageDate: today() }); } }); };
  const review = form.handleSubmit(() => setConfirm(true));
  return <div className="space-y-6"><PageHeader title="Central Warehouse Damage" description={`Damage reduces stock only in ${code}; no expense is created.`} actions={<Button onClick={() => setOpen(true)}><Plus /> Report Damage</Button>} /><DataTable columns={columns} data={history.data ?? []} isLoading={history.isLoading} error={history.isError ? "Central damage history could not be loaded." : null} onRetry={history.refetch} searchPlaceholder="Search item, batch, reason or reporter..." emptyTitle="No Central Warehouse damage" />
    <FormDialog open={open} onOpenChange={setOpen} title="Report Central Damage" description={`Assigned warehouse: ${code}`} onSubmit={review} isSubmitting={mutation.isPending} submitLabel="Review Damage"><div className="space-y-1.5"><Label>Item *</Label><ProductSelector products={products.data ?? []} value={itemCode} onChange={(v) => form.setValue("itemCode", v, { shouldValidate: true })} isLoading={products.isLoading} /><input type="hidden" {...form.register("itemCode", { required: true })} /></div><div className="grid grid-cols-2 gap-4"><Field label="Quantity *"><Input type="number" min="0.01" step="0.01" {...form.register("quantity", { required: true, validate: (v) => Number(v) > 0 })} /></Field><Field label="Damage Date *"><Input type="date" {...form.register("damageDate", { required: true })} /></Field></div><Field label="Reason *"><Textarea {...form.register("reason", { required: true })} /></Field></FormDialog>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Confirm Central Warehouse damage?" description="This will reduce the assigned Central Warehouse stock. It will not create an expense." variant="destructive" confirmLabel="Confirm Damage" loading={mutation.isPending} onConfirm={save} />
  </div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function AssignmentError() { return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h1 className="font-semibold text-destructive">Main Warehouse is not assigned.</h1><p className="text-sm text-muted-foreground">Contact Admin.</p></div>; }
