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
import { useBranches, useWarehouses } from "@/hooks/use-organization";
import { formatDateTime } from "@/lib/format";
import type { SystemUser } from "@/types";
import { validateSriLankanMobile } from "@/lib/phone-validation";
import { validateEmail } from "@/lib/email-validation";
import { toast } from "sonner";

const NO_BRANCH = "__no_branch__";

export default function UsersPage() {
  const { data, isLoading, isError, refetch } = useSystemUsers();
  const { data: roles } = useUserRoles();
  const { data: branches } = useBranches();
  const { data: warehouses } = useWarehouses();
  const createM = useCreateSystemUser();
  const updateM = useUpdateSystemUser();
  const deleteM = useDeleteSystemUser();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [deleting, setDeleting] = useState<SystemUser | null>(null);

  const form = useForm({
    defaultValues: { username: "", password: "", fullName: "", email: "", mobile: "", branchCode: "", warehouseCode: "", roleId: "", isActive: true },
  });
  const selectedRoleId = form.watch("roleId");
  const selectedRole = roles?.find((role) => String(role.roleId) === selectedRoleId);
  const isInventoryClerk = selectedRole?.roleName === "InventoryClerk";
  const branchRequired = !!selectedRole && !["Admin", "Manager", "InventoryClerk"].includes(selectedRole.roleName);
  const centralWarehouses = (warehouses ?? []).filter((warehouse) => warehouse.isCentralWarehouse && warehouse.isActive);

  const openCreate = () => {
    setEditing(null);
    form.reset({ username: "", password: "", fullName: "", email: "", mobile: "", branchCode: "", warehouseCode: "", roleId: "", isActive: true });
    setOpen(true);
  };
  const openEdit = (u: SystemUser) => {
    setEditing(u);
    form.reset({ username: u.username, password: "", fullName: u.fullName ?? "", email: u.email ?? "", mobile: u.mobile ?? "", branchCode: u.branchCode ?? "", warehouseCode: u.warehouseCode ?? "", roleId: u.roleId ? String(u.roleId) : "", isActive: u.isActive });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    const role = roles?.find((item) => String(item.roleId) === v.roleId);
    if (!role) {
      form.setError("roleId", { message: "Select a role for this user." });
      toast.error("A user role is required.", { description: "Select Admin, Manager, Branch Manager, or Cashier before saving." });
      return;
    }
    const needsBranch = !["Admin", "Manager", "InventoryClerk"].includes(role.roleName);
    if (needsBranch && !v.branchCode) {
      form.setError("branchCode", { message: `Select the branch this ${role.roleName.replace(/_/g, " ")} belongs to.` });
      toast.error("A branch is required for this role.", { description: "Branch Managers and Cashiers must be assigned to a branch." });
      return;
    }
    if (role.roleName === "InventoryClerk" && !v.warehouseCode) {
      form.setError("warehouseCode", { message: "Select the Main Warehouse assigned to this Inventory Clerk." });
      toast.error("Main Warehouse is required.", { description: "Inventory Clerk users must be assigned to an active central warehouse." });
      return;
    }
    const branchCode = role.roleName === "InventoryClerk" ? null : v.branchCode || null;
    const warehouseCode = role.roleName === "InventoryClerk" ? v.warehouseCode : null;
    if (editing) {
      updateM.mutate(
        { userCode: editing.userCode, body: { fullName: v.fullName || null, email: v.email || null, mobile: v.mobile || null, branchCode, warehouseCode, roleId: v.roleId ? Number(v.roleId) : null, isActive: v.isActive } },
        { onSuccess: () => { setOpen(false); toast.info("Assignment updated", { description: "The affected user must sign out and sign in again to apply role or warehouse changes." }); } }
      );
    } else {
      if (!v.username || !v.password) {
        toast.error("Username and password are required.");
        return;
      }
      createM.mutate(
        { userCode: null, username: v.username, password: v.password, fullName: v.fullName || null, email: v.email || null, mobile: v.mobile || null, branchCode, warehouseCode, roleId: v.roleId ? Number(v.roleId) : null, isActive: v.isActive },
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
      { accessorKey: "warehouseCode", header: "Main Warehouse", cell: ({ row }) => row.original.warehouseCode || "—" },
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
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" inputMode="email" autoComplete="email" placeholder="e.g. name@example.com" {...form.register("email", { validate: validateEmail })} />{form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}</div>
          <div className="space-y-1.5"><Label>Mobile</Label><Input type="tel" inputMode="tel" placeholder="e.g. 0771234567" {...form.register("mobile", { validate: validateSriLankanMobile })} />{form.formState.errors.mobile && <p className="text-xs text-destructive">{form.formState.errors.mobile.message}</p>}</div>
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select value={selectedRoleId} onValueChange={(v) => { const role = roles?.find((item) => String(item.roleId) === v); form.setValue("roleId", v); if (role?.roleName === "InventoryClerk") form.setValue("branchCode", ""); else form.setValue("warehouseCode", ""); form.clearErrors(["roleId", "branchCode", "warehouseCode"]); }}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>{roles?.map((r) => <SelectItem key={r.roleId} value={String(r.roleId)}>{r.roleName.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
            {form.formState.errors.roleId && <p className="text-xs text-destructive">{form.formState.errors.roleId.message}</p>}
          </div>
          {!isInventoryClerk && <div className="space-y-1.5">
            <Label>Branch{branchRequired ? " *" : " (optional)"}</Label>
            <Select value={form.watch("branchCode") || NO_BRANCH} onValueChange={(v) => { form.setValue("branchCode", v === NO_BRANCH ? "" : v); form.clearErrors("branchCode"); }}>
              <SelectTrigger><SelectValue placeholder={branchRequired ? "Select branch" : "No branch"} /></SelectTrigger>
              <SelectContent>
                {!branchRequired && <SelectItem value={NO_BRANCH}>No branch</SelectItem>}
                {branches?.map((b) => <SelectItem key={b.branchCode} value={b.branchCode}>{b.branchName}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.formState.errors.branchCode && <p className="text-xs text-destructive">{form.formState.errors.branchCode.message}</p>}
            {!branchRequired && selectedRole && <p className="text-xs text-muted-foreground">Admin and Manager users can access all branches without an assignment.</p>}
          </div>}
          {isInventoryClerk && <div className="space-y-1.5">
            <Label>Main Warehouse *</Label>
            <Select value={form.watch("warehouseCode")} onValueChange={(v) => { form.setValue("warehouseCode", v); form.clearErrors("warehouseCode"); }}>
              <SelectTrigger><SelectValue placeholder="Select Main Warehouse" /></SelectTrigger>
              <SelectContent>{centralWarehouses.map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={warehouse.warehouseCode}>{warehouse.warehouseName} ({warehouse.warehouseCode})</SelectItem>)}</SelectContent>
            </Select>
            {form.formState.errors.warehouseCode && <p className="text-xs text-destructive">{form.formState.errors.warehouseCode.message}</p>}
            <p className="text-xs text-muted-foreground">Only active central warehouses can be assigned.</p>
          </div>}
          <div className="flex items-center gap-2 pt-6"><Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} /><Label>Active</Label></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.username}?`} variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.userCode, { onSuccess: () => setDeleting(null) })} />
    </div>
  );
}
