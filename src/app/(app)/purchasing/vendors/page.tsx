"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Landmark, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  useCreateVendor,
  useDeleteVendor,
  useRecordVendorPayment,
  useUpdateVendor,
  useVendorLedgerByVendor,
  useVendors,
} from "@/hooks/use-party";
import { formatMoney } from "@/lib/format";
import type { Vendor } from "@/types";
import { useAuthStore } from "@/store/auth-store";
import { canManagePurchasing } from "@/lib/permissions";

export default function VendorsPage() {
  const role = useAuthStore((s) => s.user?.roleName);
  const canManage = canManagePurchasing(role);

  const { data, isLoading, isError, refetch } = useVendors();
  const createM = useCreateVendor();
  const updateM = useUpdateVendor();
  const deleteM = useDeleteVendor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState<Vendor | null>(null);
  const [ledgerFor, setLedgerFor] = useState<Vendor | null>(null);

  const form = useForm({ defaultValues: { vendorName: "", address: "", phone: "", email: "", contactPerson: "", isActive: true } });

  const openCreate = () => { setEditing(null); form.reset({ vendorName: "", address: "", phone: "", email: "", contactPerson: "", isActive: true }); setOpen(true); };
  const openEdit = (v: Vendor) => {
    setEditing(v);
    form.reset({ vendorName: v.vendorName, address: v.address ?? "", phone: v.phone ?? "", email: v.email ?? "", contactPerson: v.contactPerson ?? "", isActive: v.isActive });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    const body = { vendorName: v.vendorName, address: v.address || null, phone: v.phone || null, email: v.email || null, contactPerson: v.contactPerson || null, isActive: v.isActive };
    if (editing) updateM.mutate({ id: editing.vendorId, body }, { onSuccess: () => setOpen(false) });
    else createM.mutate({ vendorCode: null, ...body }, { onSuccess: () => setOpen(false) });
  });

  const columns = useMemo<ColumnDef<Vendor>[]>(
    () => [
      { accessorKey: "vendorCode", header: "Code" },
      {
        accessorKey: "vendorName",
        header: "Vendor",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.vendorName}</p>
            <p className="text-xs text-muted-foreground">{row.original.contactPerson || row.original.phone || "—"}</p>
          </div>
        ),
      },
      { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "—" },
      { accessorKey: "isActive", header: "Status", cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "secondary"}>{row.original.isActive ? "Active" : "Inactive"}</Badge> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLedgerFor(row.original)} title="Ledger">
              <Wallet className="h-4 w-4" />
            </Button>
            {canManage && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(row.original)}><Trash2 className="h-4 w-4" /></Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [canManage]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Manage suppliers and track what your business owes them."
        actions={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Vendor</Button>}
      />

      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search vendors…" emptyTitle="No vendors yet" />

      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Vendor" : "New Vendor"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5"><Label>Vendor Name *</Label><Input {...form.register("vendorName")} /></div>
          <div className="space-y-1.5"><Label>Contact Person</Label><Input {...form.register("contactPerson")} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input {...form.register("phone")} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Email</Label><Input type="email" {...form.register("email")} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input {...form.register("address")} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} /><Label>Active</Label></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.vendorName}?`} variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.vendorId, { onSuccess: () => setDeleting(null) })} />

      <VendorLedgerDialog vendor={ledgerFor} onClose={() => setLedgerFor(null)} canManage={canManage} />
    </div>
  );
}

function VendorLedgerDialog({ vendor, onClose, canManage }: { vendor: Vendor | null; onClose: () => void; canManage: boolean }) {
  const { data: ledger, isLoading } = useVendorLedgerByVendor(vendor?.vendorId);
  const payM = useRecordVendorPayment();
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  const submitPayment = () => {
    if (!vendor || !amount) return;
    payM.mutate(
      { vendorId: vendor.vendorId, body: { amount: Number(amount), remarks: remarks || null } },
      { onSuccess: () => { setAmount(""); setRemarks(""); } }
    );
  };

  return (
    <Dialog open={!!vendor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Landmark className="h-4 w-4" /> {vendor?.vendorName} — Ledger</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3"><p className="text-xs text-muted-foreground">GRN Total</p><p className="num text-lg font-semibold">{formatMoney(ledger?.grnTotal)}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Returns</p><p className="num text-lg font-semibold">{formatMoney(ledger?.returnTotal)}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Paid</p><p className="num text-lg font-semibold">{formatMoney(ledger?.paidCredit)}</p></Card>
              <Card className="p-3 border-warning/40 bg-warning/5"><p className="text-xs text-muted-foreground">Outstanding</p><p className="num text-lg font-bold text-warning">{formatMoney(ledger?.outstandingBalance)}</p></Card>
            </div>

            {canManage && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <Label>Record a Payment</Label>
                <div className="flex gap-2">
                  <Input type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <Button onClick={submitPayment} disabled={!amount || payM.isPending}>Pay</Button>
                </div>
                <Input placeholder="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
