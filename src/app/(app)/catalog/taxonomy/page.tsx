"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useBrands,
  useCategories,
  useCreateBrand,
  useCreateCategory,
  useCreateTaxMaster,
  useDeleteBrand,
  useDeleteCategory,
  useDeleteTaxMaster,
  useTaxMasters,
  useUpdateBrand,
  useUpdateCategory,
  useUpdateTaxMaster,
} from "@/hooks/use-catalog";
import type { Brand, Category, TaxMaster } from "@/types";

export default function TaxonomyPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Categories, Brands & Tax" description="Organize your catalog structure and tax rates." />
      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="tax">Tax Rates</TabsTrigger>
        </TabsList>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="brands"><BrandsTab /></TabsContent>
        <TabsContent value="tax"><TaxTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CategoriesTab() {
  const { data, isLoading, isError, refetch } = useCategories();
  const createM = useCreateCategory();
  const updateM = useUpdateCategory();
  const deleteM = useDeleteCategory();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const form = useForm({ defaultValues: { categoryName: "", parentCategoryId: "", description: "", isActive: true } });

  const openCreate = () => {
    setEditing(null);
    form.reset({ categoryName: "", parentCategoryId: "", description: "", isActive: true });
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    form.reset({
      categoryName: c.categoryName,
      parentCategoryId: c.parentCategoryId ? String(c.parentCategoryId) : "",
      description: c.description ?? "",
      isActive: c.isActive,
    });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    const body = {
      categoryName: v.categoryName,
      parentCategoryId: v.parentCategoryId ? Number(v.parentCategoryId) : null,
      description: v.description || null,
      isActive: v.isActive,
    };
    if (editing) updateM.mutate({ id: editing.categoryId, body }, { onSuccess: () => setOpen(false) });
    else createM.mutate(body, { onSuccess: () => setOpen(false) });
  });

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      { accessorKey: "categoryName", header: "Category" },
      { accessorKey: "parentCategoryName", header: "Parent", cell: ({ row }) => row.original.parentCategoryName || "—" },
      { accessorKey: "description", header: "Description", cell: ({ row }) => row.original.description || "—" },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "secondary"}>{row.original.isActive ? "Active" : "Inactive"}</Badge>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(row.original)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Category</Button>
      </div>
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search categories…" emptyTitle="No categories yet" />

      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Category" : "New Category"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Name *</Label><Input {...form.register("categoryName")} /></div>
          <div className="space-y-1.5">
            <Label>Parent Category</Label>
            <Select value={form.watch("parentCategoryId")} onValueChange={(v) => form.setValue("parentCategoryId", v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {data?.filter((c) => c.categoryId !== editing?.categoryId).map((c) => (
                  <SelectItem key={c.categoryId} value={String(c.categoryId)}>{c.categoryName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} {...form.register("description")} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} /><Label>Active</Label></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.categoryName}?`} description="Categories with children or linked products can't be deleted." variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.categoryId, { onSuccess: () => setDeleting(null) })} />
    </div>
  );
}

function BrandsTab() {
  const { data, isLoading, isError, refetch } = useBrands();
  const createM = useCreateBrand();
  const updateM = useUpdateBrand();
  const deleteM = useDeleteBrand();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const form = useForm({ defaultValues: { brandName: "", description: "", isActive: true } });

  const openCreate = () => { setEditing(null); form.reset({ brandName: "", description: "", isActive: true }); setOpen(true); };
  const openEdit = (b: Brand) => { setEditing(b); form.reset({ brandName: b.brandName, description: b.description ?? "", isActive: b.isActive }); setOpen(true); };

  const onSubmit = form.handleSubmit((v) => {
    const body = { brandName: v.brandName, description: v.description || null, isActive: v.isActive };
    if (editing) updateM.mutate({ id: editing.brandId, body }, { onSuccess: () => setOpen(false) });
    else createM.mutate(body, { onSuccess: () => setOpen(false) });
  });

  const columns = useMemo<ColumnDef<Brand>[]>(
    () => [
      { accessorKey: "brandName", header: "Brand" },
      { accessorKey: "description", header: "Description", cell: ({ row }) => row.original.description || "—" },
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
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openCreate}><Plus className="h-4 w-4" /> New Brand</Button></div>
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search brands…" emptyTitle="No brands yet" />
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Brand" : "New Brand"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Name *</Label><Input {...form.register("brandName")} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} {...form.register("description")} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} /><Label>Active</Label></div>
        </div>
      </FormDialog>
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.brandName}?`} description="Brands referenced by products can't be deleted." variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.brandId, { onSuccess: () => setDeleting(null) })} />
    </div>
  );
}

function TaxTab() {
  const { data, isLoading, isError, refetch } = useTaxMasters();
  const createM = useCreateTaxMaster();
  const updateM = useUpdateTaxMaster();
  const deleteM = useDeleteTaxMaster();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxMaster | null>(null);
  const [deleting, setDeleting] = useState<TaxMaster | null>(null);
  const form = useForm({ defaultValues: { taxCode: "", taxName: "", percentage: 0, description: "", isActive: true } });

  const openCreate = () => { setEditing(null); form.reset({ taxCode: "", taxName: "", percentage: 0, description: "", isActive: true }); setOpen(true); };
  const openEdit = (t: TaxMaster) => { setEditing(t); form.reset({ taxCode: t.taxCode, taxName: t.taxName, percentage: t.percentage, description: t.description ?? "", isActive: t.isActive }); setOpen(true); };

  const onSubmit = form.handleSubmit((v) => {
    if (editing) {
      updateM.mutate({ code: editing.taxCode, body: { taxName: v.taxName, percentage: Number(v.percentage), description: v.description || null, isActive: v.isActive } }, { onSuccess: () => setOpen(false) });
    } else {
      createM.mutate({ taxCode: v.taxCode, taxName: v.taxName, percentage: Number(v.percentage), description: v.description || null, isActive: v.isActive }, { onSuccess: () => setOpen(false) });
    }
  });

  const columns = useMemo<ColumnDef<TaxMaster>[]>(
    () => [
      { accessorKey: "taxCode", header: "Code" },
      { accessorKey: "taxName", header: "Name" },
      { accessorKey: "percentage", header: "Rate", cell: ({ row }) => <span className="num">{row.original.percentage}%</span> },
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
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openCreate}><Plus className="h-4 w-4" /> New Tax Rate</Button></div>
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search tax rates…" emptyTitle="No tax rates yet" />
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Tax Rate" : "New Tax Rate"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          {!editing && <div className="space-y-1.5 col-span-1"><Label>Tax Code *</Label><Input {...form.register("taxCode")} /></div>}
          <div className={`space-y-1.5 ${editing ? "col-span-2" : "col-span-1"}`}><Label>Name *</Label><Input {...form.register("taxName")} /></div>
          <div className="space-y-1.5"><Label>Percentage *</Label><Input type="number" step="0.01" {...form.register("percentage")} /></div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} /><Label>Active</Label></div>
          <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea rows={2} {...form.register("description")} /></div>
        </div>
      </FormDialog>
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.taxName}?`} variant="destructive" confirmLabel="Delete" loading={deleteM.isPending} onConfirm={() => deleting && deleteM.mutate(deleting.taxCode, { onSuccess: () => setDeleting(null) })} />
    </div>
  );
}
