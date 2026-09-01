"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useBranches,
  useCompanies,
  useCreateBranch,
  useCreateCompany,
  useDeleteBranch,
  useDeleteCompany,
  useUpdateBranch,
  useUpdateCompany,
} from "@/hooks/use-organization";
import type { Branch, BranchStatus, Company } from "@/types";
import { toast } from "sonner";

export default function OrganizationPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Organization" description="Manage companies and branches." />
      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>
        <TabsContent value="companies"><CompaniesTab /></TabsContent>
        <TabsContent value="branches"><BranchesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CompaniesTab() {
  const { data, isLoading, isError, refetch } = useCompanies();
  const createM = useCreateCompany();
  const updateM = useUpdateCompany();
  const deleteM = useDeleteCompany();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);
  const form = useForm({ defaultValues: { companyCode: "", companyName: "", address: "", phone: "", email: "", registrationNo: "", taxId: "" } });

  const openCreate = () => { setEditing(null); form.reset({ companyCode: "", companyName: "", address: "", phone: "", email: "", registrationNo: "", taxId: "" }); setOpen(true); };
  const openEdit = (c: Company) => {
    setEditing(c);
    form.reset({ companyCode: c.companyCode, companyName: c.companyName, address: c.address ?? "", phone: c.phone ?? "", email: c.email ?? "", registrationNo: c.registrationNo ?? "", taxId: c.taxId ?? "" });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    const body = { companyName: v.companyName, address: v.address || null, phone: v.phone || null, email: v.email || null, registrationNo: v.registrationNo || null, taxId: v.taxId || null };
    if (editing) updateM.mutate({ code: editing.companyCode, body }, { onSuccess: () => setOpen(false) });
    else {
      if (!v.companyCode) { toast.error("Company code is required."); return; }
      createM.mutate({ companyCode: v.companyCode, ...body }, { onSuccess: () => setOpen(false) });
    }
  });

  const columns = useMemo<ColumnDef<Company>[]>(
    () => [
      { accessorKey: "companyCode", header: "Code" },
      { accessorKey: "companyName", header: "Company Name" },
      { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone || "—" },
      { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "—" },
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
    <div className="mt-4 space-y-4">
      <div className="flex justify-end"><Button onClick={openCreate}><Plus className="h-4 w-4" /> New Company</Button></div>
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search companies…" emptyTitle="No companies yet" />
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Company" : "New Company"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          {!editing && <div className="space-y-1.5"><Label>Company Code *</Label><Input {...form.register("companyCode")} /></div>}
          <div className={`space-y-1.5 ${editing ? "col-span-2" : ""}`}><Label>Company Name *</Label><Input {...form.register("companyName")} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input {...form.register("phone")} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input {...form.register("email")} /></div>
          <div className="space-y-1.5"><Label>Registration No.</Label><Input {...form.register("registrationNo")} /></div>
          <div className="space-y-1.5"><Label>Tax ID</Label><Input {...form.register("taxId")} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input {...form.register("address")} /></div>
        </div>
      </FormDialog>
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.companyName}?`} description="Companies with branches can't be deleted." variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.companyCode, { onSuccess: () => setDeleting(null) })} />
    </div>
  );
}

function BranchesTab() {
  const { data: branches, isLoading, isError, refetch } = useBranches();
  const { data: companies } = useCompanies();
  const createM = useCreateBranch();
  const updateM = useUpdateBranch();
  const deleteM = useDeleteBranch();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const form = useForm({ defaultValues: { branchCode: "", branchName: "", address: "", phone: "", status: "Active" as BranchStatus, companyCode: "" } });

  const openCreate = () => { setEditing(null); form.reset({ branchCode: "", branchName: "", address: "", phone: "", status: "Active", companyCode: "" }); setOpen(true); };
  const openEdit = (b: Branch) => {
    setEditing(b);
    form.reset({ branchCode: b.branchCode, branchName: b.branchName, address: b.address ?? "", phone: b.phone ?? "", status: b.status, companyCode: b.companyCode ?? "" });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    const body = { branchName: v.branchName, address: v.address || null, phone: v.phone || null, status: v.status, companyCode: v.companyCode || null };
    if (editing) updateM.mutate({ code: editing.branchCode, body }, { onSuccess: () => setOpen(false) });
    else {
      if (!v.branchCode) { toast.error("Branch code is required."); return; }
      createM.mutate({ branchCode: v.branchCode, ...body }, { onSuccess: () => setOpen(false) });
    }
  });

  const columns = useMemo<ColumnDef<Branch>[]>(
    () => [
      { accessorKey: "branchCode", header: "Code" },
      { accessorKey: "branchName", header: "Branch Name" },
      { accessorKey: "companyCode", header: "Company", cell: ({ row }) => row.original.companyCode || "—" },
      { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone || "—" },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={row.original.status === "Active" ? "success" : "secondary"}>{row.original.status}</Badge> },
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
    <div className="mt-4 space-y-4">
      <div className="flex justify-end"><Button onClick={openCreate}><Plus className="h-4 w-4" /> New Branch</Button></div>
      <DataTable columns={columns} data={branches ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search branches…" emptyTitle="No branches yet" />
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Branch" : "New Branch"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          {!editing && <div className="space-y-1.5"><Label>Branch Code *</Label><Input {...form.register("branchCode")} /></div>}
          <div className={`space-y-1.5 ${editing ? "col-span-2" : ""}`}><Label>Branch Name *</Label><Input {...form.register("branchName")} /></div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={form.watch("companyCode")} onValueChange={(v) => form.setValue("companyCode", v)}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies?.map((c) => <SelectItem key={c.companyCode} value={c.companyCode}>{c.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as BranchStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Phone</Label><Input {...form.register("phone")} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input {...form.register("address")} /></div>
        </div>
      </FormDialog>
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.branchName}?`} variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.branchCode, { onSuccess: () => setDeleting(null) })} />
    </div>
  );
}
