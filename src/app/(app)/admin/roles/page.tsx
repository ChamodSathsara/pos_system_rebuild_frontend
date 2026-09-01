"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useAssignPermission,
  useCreatePermission,
  useCreateUserRole,
  useDeletePermission,
  useDeleteUserRole,
  usePermissions,
  useUnassignPermission,
  useUpdateUserRole,
  useUserRoleDetails,
  useUserRoles,
} from "@/hooks/use-security";
import type { UserRole } from "@/types";
import { toast } from "sonner";

export default function RolesPage() {
  const { data: roles, isLoading, isError, refetch } = useUserRoles();
  const createM = useCreateUserRole();
  const updateM = useUpdateUserRole();
  const deleteM = useDeleteUserRole();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRole | null>(null);
  const [deleting, setDeleting] = useState<UserRole | null>(null);
  const [permissionsFor, setPermissionsFor] = useState<UserRole | null>(null);
  const [permCatalogOpen, setPermCatalogOpen] = useState(false);

  const form = useForm({ defaultValues: { roleName: "", description: "" } });

  const openCreate = () => { setEditing(null); form.reset({ roleName: "", description: "" }); setOpen(true); };
  const openEdit = (r: UserRole) => { setEditing(r); form.reset({ roleName: r.roleName, description: r.description ?? "" }); setOpen(true); };

  const onSubmit = form.handleSubmit((v) => {
    if (!v.roleName) { toast.error("Role name is required."); return; }
    const body = { roleName: v.roleName, description: v.description || null };
    if (editing) updateM.mutate({ roleId: editing.roleId, body }, { onSuccess: () => setOpen(false) });
    else createM.mutate(body, { onSuccess: () => setOpen(false) });
  });

  const columns = useMemo<ColumnDef<UserRole>[]>(
    () => [
      { accessorKey: "roleName", header: "Role", cell: ({ row }) => row.original.roleName.replace(/_/g, " ") },
      { accessorKey: "description", header: "Description", cell: ({ row }) => row.original.description || "—" },
      { id: "actions", header: "", cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="outline" size="xs" onClick={() => setPermissionsFor(row.original)}><ShieldCheck className="h-3.5 w-3.5" /> Permissions</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(row.original)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      )},
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Define roles and the permissions assigned to each."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPermCatalogOpen(true)}>Manage Permission Catalog</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Role</Button>
          </div>
        }
      />

      <DataTable columns={columns} data={roles ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search roles…" emptyTitle="No roles yet" />

      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Role" : "New Role"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Role Name *</Label><Input {...form.register("roleName")} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} {...form.register("description")} /></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.roleName}?`} variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.roleId, { onSuccess: () => setDeleting(null) })} />

      <RolePermissionsDialog role={permissionsFor} onClose={() => setPermissionsFor(null)} />
      <PermissionCatalogDialog open={permCatalogOpen} onOpenChange={setPermCatalogOpen} />
    </div>
  );
}

function RolePermissionsDialog({ role, onClose }: { role: UserRole | null; onClose: () => void }) {
  const { data: details, isLoading } = useUserRoleDetails(role?.roleId);
  const { data: allPermissions } = usePermissions();
  const assignM = useAssignPermission();
  const unassignM = useUnassignPermission();

  const assignedIds = new Set((details?.permissions ?? []).map((p) => p.permissionId));

  const toggle = (permissionId: number, checked: boolean) => {
    if (!role) return;
    if (checked) assignM.mutate({ roleId: role.roleId, permissionId });
    else unassignM.mutate({ roleId: role.roleId, permissionId });
  };

  return (
    <Dialog open={!!role} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{role?.roleName.replace(/_/g, " ")} — Permissions</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !allPermissions || allPermissions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No permissions defined yet. Add some in the permission catalog.</p>
          ) : (
            <div className="space-y-1 pr-2">
              {allPermissions.map((p) => (
                <label key={p.permissionId} className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-secondary/50">
                  <Checkbox checked={assignedIds.has(p.permissionId)} onCheckedChange={(c) => toggle(p.permissionId, !!c)} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.permissionName}</p>
                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function PermissionCatalogDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: permissions, isLoading } = usePermissions();
  const createM = useCreatePermission();
  const deleteM = useDeletePermission();
  const form = useForm({ defaultValues: { permissionName: "", description: "" } });

  const onSubmit = form.handleSubmit((v) => {
    if (!v.permissionName) return;
    createM.mutate({ permissionName: v.permissionName, description: v.description || null }, { onSuccess: () => form.reset() });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Permission Catalog</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input placeholder="Permission name" {...form.register("permissionName")} />
          <Button type="submit" disabled={createM.isPending}><Plus className="h-4 w-4" /> Add</Button>
        </form>
        <ScrollArea className="max-h-72">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !permissions || permissions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No permissions yet.</p>
          ) : (
            <div className="space-y-1 pr-2">
              {permissions.map((p) => (
                <div key={p.permissionId} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-secondary/50">
                  <span className="text-sm">{p.permissionName}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteM.mutate(p.permissionId)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
