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
import { useCreateSystemUser, useDeleteSystemUser, useSystemUsers, useUpdateSystemUser, useUserRoles } from "@/hooks/use-security";
import { useBranches } from "@/hooks/use-organization";
import { formatDateTime } from "@/lib/format";
import type { SystemUser } from "@/types";
import { toast } from "sonner";

export default function UsersPage() {
  const { data, isLoading, isError, refetch } = useSystemUsers();
  const { data: roles } = useUserRoles();
  const { data: branches } = useBranches();
  const createM = useCreateSystemUser();
  const updateM = useUpdateSystemUser();
  const deleteM = useDeleteSystemUser();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [deleting, setDeleting] = useState<SystemUser | null>(null);

  const form = useForm({
    defaultValues: { username: "", password: "", fullName: "", email: "", mobile: "", branchCode: "", roleId: "", isActive: true },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ username: "", password: "", fullName: "", email: "", mobile: "", branchCode: "", roleId: "", isActive: true });
    setOpen(true);
  };
  const openEdit = (u: SystemUser) => {
    setEditing(u);
    form.reset({ username: u.username, password: "", fullName: u.fullName ?? "", email: u.email ?? "", mobile: u.mobile ?? "", branchCode: u.branchCode ?? "", roleId: u.roleId ? String(u.roleId) : "", isActive: u.isActive });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    if (editing) {
      updateM.mutate(
        { userCode: editing.userCode, body: { fullName: v.fullName || null, email: v.email || null, mobile: v.mobile || null, branchCode: v.branchCode || null, roleId: v.roleId ? Number(v.roleId) : null, isActive: v.isActive } },
        { onSuccess: () => setOpen(false) }
      );
    } else {
      if (!v.username || !v.password) {
        toast.error("Username and password are required.");
        return;
      }
      createM.mutate(
        { userCode: null, username: v.username, password: v.password, fullName: v.fullName || null, email: v.email || null, mobile: v.mobile || null, branchCode: v.branchCode || null, roleId: v.roleId ? Number(v.roleId) : null, isActive: v.isActive },
        { onSuccess: () => setOpen(false) }
      );
    }
  });

  const columns = useMemo<ColumnDef<SystemUser>[]>(
    () => [
      { accessorKey: "userCode", header: "Code" },
      { accessorKey: "username", header: "Username", cell: ({ row }) => <div><p className="font-medium">{row.original.username}</p><p className="text-xs text-muted-foreground">{row.original.fullName}</p></div> },
      { accessorKey: "roleName", header: "Role", cell: ({ row }) => row.original.roleName ? <Badge variant="outline">{row.original.roleName.replace(/_/g, " ")}</Badge> : "—" },
      { accessorKey: "branchCode", header: "Branch", cell: ({ row }) => row.original.branchCode || "All" },
      { accessorKey: "lastLogin", header: "Last Login", cell: ({ row }) => formatDateTime(row.original.lastLogin) },
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
      <PageHeader title="Users" description="Manage system users, roles, and branch assignments." actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New User</Button>} />
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search users…" emptyTitle="No users yet" />

      <FormDialog open={open} onOpenChange={setOpen} title={editing ? `Edit ${editing.username}` : "New User"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          {!editing && (
            <>
              <div className="space-y-1.5"><Label>Username *</Label><Input {...form.register("username")} /></div>
              <div className="space-y-1.5"><Label>Password *</Label><Input type="password" {...form.register("password")} /></div>
            </>
          )}
          <div className="col-span-2 space-y-1.5"><Label>Full Name</Label><Input {...form.register("fullName")} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" {...form.register("email")} /></div>
          <div className="space-y-1.5"><Label>Mobile</Label><Input {...form.register("mobile")} /></div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.watch("roleId")} onValueChange={(v) => form.setValue("roleId", v)}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>{roles?.map((r) => <SelectItem key={r.roleId} value={String(r.roleId)}>{r.roleName.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Branch (leave blank for all-branch roles)</Label>
            <Select value={form.watch("branchCode")} onValueChange={(v) => form.setValue("branchCode", v)}>
              <SelectTrigger><SelectValue placeholder="No branch" /></SelectTrigger>
              <SelectContent>{branches?.map((b) => <SelectItem key={b.branchCode} value={b.branchCode}>{b.branchName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} /><Label>Active</Label></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.username}?`} variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.userCode, { onSuccess: () => setDeleting(null) })} />
    </div>
  );
}
