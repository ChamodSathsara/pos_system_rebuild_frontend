"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { History, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCategories,
  useCreateBrand,
  useCreateCategory,
  useCreateProduct,
  useCreateTaxMaster,
  useDeleteProduct,
  useItemLogs,
  useProducts,
  useTaxMasters,
  useUpdateProduct,
} from "@/hooks/use-catalog";
import { useBrands } from "@/hooks/use-catalog";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ItemGroup, Product, UnitOfMeasure } from "@/types";
import { useAuthStore } from "@/store/auth-store";
import { canManageCatalog } from "@/lib/permissions";

const schema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitOfMeasure: z.enum(UnitOfMeasure),
  itemGroup: z.enum(ItemGroup),
  barcode: z.string().optional(),
  costPrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  reorderLevel: z.coerce.number().min(0).optional(),
  taxCode: z.string().optional(),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function ProductsPage() {
  const role = useAuthStore((s) => s.user?.roleName);
  const canManage = canManageCatalog(role);

  const { data: products, isLoading, isError, refetch } = useProducts();
  const { data: categories } = useCategories(true);
  const { data: brands } = useBrands(true);
  const { data: taxes } = useTaxMasters(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [historyFor, setHistoryFor] = useState<Product | null>(null);
  const [quickCreate, setQuickCreate] = useState<"category" | "brand" | "tax" | null>(null);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, unitOfMeasure: "PCS", itemGroup: "Consumables" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ isActive: true, unitOfMeasure: "PCS", itemGroup: "Consumables", itemName: "", description: "", categoryId: undefined, brandId: undefined, barcode: "", costPrice: undefined, sellingPrice: undefined, reorderLevel: undefined, taxCode: undefined });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    form.reset({
      itemName: p.itemName,
      description: p.description ?? "",
      categoryId: p.categoryId ? String(p.categoryId) : undefined,
      brandId: p.brandId ? String(p.brandId) : undefined,
      unitOfMeasure: p.unitOfMeasure,
      itemGroup: p.itemGroup,
      barcode: p.barcode ?? "",
      costPrice: p.costPrice ?? undefined,
      sellingPrice: p.sellingPrice ?? undefined,
      reorderLevel: p.reorderLevel ?? undefined,
      taxCode: p.taxCode ?? undefined,
      isActive: p.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = form.handleSubmit((values) => {
    const body = {
      itemName: values.itemName,
      description: values.description || null,
      categoryId: values.categoryId ? Number(values.categoryId) : null,
      brandId: values.brandId ? Number(values.brandId) : null,
      unitOfMeasure: values.unitOfMeasure,
      itemGroup: values.itemGroup,
      barcode: values.barcode || null,
      costPrice: values.costPrice ?? null,
      sellingPrice: values.sellingPrice ?? null,
      reorderLevel: values.reorderLevel ?? null,
      taxCode: values.taxCode || null,
      isActive: values.isActive,
    };
    if (editing) {
      updateMutation.mutate(
        { itemCode: editing.itemCode, body },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createMutation.mutate(
        { itemCode: null, ...body },
        { onSuccess: () => setDialogOpen(false) }
      );
    }
  });

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { accessorKey: "itemCode", header: "Item Code" },
      {
        accessorKey: "itemName",
        header: "Item",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.itemName}</p>
            <p className="text-xs text-muted-foreground">{row.original.barcode || "No barcode"}</p>
          </div>
        ),
      },
      { accessorKey: "categoryName", header: "Category", cell: ({ row }) => row.original.categoryName || "—" },
      { accessorKey: "brandName", header: "Brand", cell: ({ row }) => row.original.brandName || "—" },
      {
        accessorKey: "sellingPrice",
        header: "Selling Price",
        cell: ({ row }) => <span className="num">{formatMoney(row.original.sellingPrice)}</span>,
      },
      { accessorKey: "unitOfMeasure", header: "UoM" },
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistoryFor(row.original)} title="History">
              <History className="h-4 w-4" />
            </Button>
            {canManage && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row.original)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleting(row.original)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
        title="Products"
        description="Manage your item catalog, pricing, and tax mapping."
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Product
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={products ?? []}
        isLoading={isLoading}
        error={isError ? "Failed to load products." : null}
        onRetry={refetch}
        searchPlaceholder="Search products by name or code…"
        emptyTitle="No products yet"
        emptyDescription="Add your first product to start building your catalog."
        pageSize={10}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Edit ${editing.itemCode}` : "New Product"}
        description="Fields marked with an asterisk are required."
        onSubmit={onSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editing ? "Save Changes" : "Create Product"}
        className="sm:max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Item Name *</Label>
            <Input {...form.register("itemName")} />
            {form.formState.errors.itemName && <p className="text-xs text-destructive">{form.formState.errors.itemName.message}</p>}
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} {...form.register("description")} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Category</Label>
              <Button type="button" variant="ghost" size="xs" onClick={() => setQuickCreate("category")}><Plus /> Create new</Button>
            </div>
            <Select value={form.watch("categoryId") ?? ""} onValueChange={(v) => form.setValue("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.categoryId} value={String(c.categoryId)}>{c.categoryName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Brand</Label>
              <Button type="button" variant="ghost" size="xs" onClick={() => setQuickCreate("brand")}><Plus /> Create new</Button>
            </div>
            <Select value={form.watch("brandId") ?? ""} onValueChange={(v) => form.setValue("brandId", v)}>
              <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
              <SelectContent>
                {brands?.map((b) => (
                  <SelectItem key={b.brandId} value={String(b.brandId)}>{b.brandName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unit of Measure *</Label>
            <Select value={form.watch("unitOfMeasure")} onValueChange={(v) => form.setValue("unitOfMeasure", v as FormValues["unitOfMeasure"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UnitOfMeasure.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Item Group *</Label>
            <Select value={form.watch("itemGroup")} onValueChange={(v) => form.setValue("itemGroup", v as FormValues["itemGroup"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ItemGroup.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Barcode</Label>
            <Input {...form.register("barcode")} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Tax Rate</Label>
              <Button type="button" variant="ghost" size="xs" onClick={() => setQuickCreate("tax")}><Plus /> Create new</Button>
            </div>
            <Select value={form.watch("taxCode") ?? ""} onValueChange={(v) => form.setValue("taxCode", v)}>
              <SelectTrigger><SelectValue placeholder="No tax" /></SelectTrigger>
              <SelectContent>
                {taxes?.map((t) => (
                  <SelectItem key={t.taxCode} value={t.taxCode}>{t.taxName} ({t.percentage}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cost Price</Label>
            <Input type="number" step="0.01" {...form.register("costPrice")} />
          </div>
          <div className="space-y-1.5">
            <Label>Selling Price</Label>
            <Input type="number" step="0.01" {...form.register("sellingPrice")} />
          </div>
          <div className="space-y-1.5">
            <Label>Reorder Level</Label>
            <Input type="number" {...form.register("reorderLevel")} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} />
            <Label>Active</Label>
          </div>
        </div>
      </FormDialog>

      <QuickCreateCategoryDialog
        open={quickCreate === "category"}
        onOpenChange={(open) => !open && setQuickCreate(null)}
        onCreated={(categoryId) => form.setValue("categoryId", String(categoryId), { shouldDirty: true })}
      />
      <QuickCreateBrandDialog
        open={quickCreate === "brand"}
        onOpenChange={(open) => !open && setQuickCreate(null)}
        onCreated={(brandId) => form.setValue("brandId", String(brandId), { shouldDirty: true })}
      />
      <QuickCreateTaxDialog
        open={quickCreate === "tax"}
        onOpenChange={(open) => !open && setQuickCreate(null)}
        onCreated={(taxCode) => form.setValue("taxCode", taxCode, { shouldDirty: true })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.itemName}?`}
        description="This will permanently remove the product. This can't be undone."
        variant="destructive"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() =>
          deleting &&
          deleteMutation.mutate(deleting.itemCode, {
            onSuccess: () => setDeleting(null),
          })
        }
      />

      <ItemHistoryDialog product={historyFor} onClose={() => setHistoryFor(null)} />
    </div>
  );
}

function QuickCreateCategoryDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: number) => void }) {
  const form = useForm({ defaultValues: { categoryName: "", description: "" } });
  const createMutation = useCreateCategory();
  const submit = form.handleSubmit((values) => {
    if (!values.categoryName.trim()) {
      form.setError("categoryName", { message: "Category name is required." });
      return;
    }
    createMutation.mutate(
      { categoryName: values.categoryName.trim(), description: values.description.trim() || null, parentCategoryId: null, isActive: true },
      { onSuccess: (category) => { onCreated(category.categoryId); form.reset(); onOpenChange(false); } }
    );
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="New Category" description="Create and select a category without leaving the product." onSubmit={submit} isSubmitting={createMutation.isPending} submitLabel="Create Category">
      <div className="space-y-4">
        <div className="space-y-1.5"><Label>Category Name *</Label><Input autoFocus {...form.register("categoryName")} />{form.formState.errors.categoryName && <p className="text-xs text-destructive">{form.formState.errors.categoryName.message}</p>}</div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} {...form.register("description")} /></div>
      </div>
    </FormDialog>
  );
}

function QuickCreateBrandDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: number) => void }) {
  const form = useForm({ defaultValues: { brandName: "", description: "" } });
  const createMutation = useCreateBrand();
  const submit = form.handleSubmit((values) => {
    if (!values.brandName.trim()) {
      form.setError("brandName", { message: "Brand name is required." });
      return;
    }
    createMutation.mutate(
      { brandName: values.brandName.trim(), description: values.description.trim() || null, isActive: true },
      { onSuccess: (brand) => { onCreated(brand.brandId); form.reset(); onOpenChange(false); } }
    );
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="New Brand" description="Create and select a brand without leaving the product." onSubmit={submit} isSubmitting={createMutation.isPending} submitLabel="Create Brand">
      <div className="space-y-4">
        <div className="space-y-1.5"><Label>Brand Name *</Label><Input autoFocus {...form.register("brandName")} />{form.formState.errors.brandName && <p className="text-xs text-destructive">{form.formState.errors.brandName.message}</p>}</div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} {...form.register("description")} /></div>
      </div>
    </FormDialog>
  );
}

function QuickCreateTaxDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (code: string) => void }) {
  const form = useForm({ defaultValues: { taxCode: "", taxName: "", percentage: "", description: "" } });
  const createMutation = useCreateTaxMaster();
  const submit = form.handleSubmit((values) => {
    const percentage = Number(values.percentage);
    let invalid = false;
    if (!values.taxCode.trim()) { form.setError("taxCode", { message: "Tax code is required." }); invalid = true; }
    if (!values.taxName.trim()) { form.setError("taxName", { message: "Tax name is required." }); invalid = true; }
    if (values.percentage === "" || !Number.isFinite(percentage) || percentage < 0) { form.setError("percentage", { message: "Enter a valid non-negative percentage." }); invalid = true; }
    if (invalid) return;
    const taxCode = values.taxCode.trim();
    createMutation.mutate(
      { taxCode, taxName: values.taxName.trim(), percentage, description: values.description.trim() || null, isActive: true },
      { onSuccess: (tax) => { onCreated(tax.taxCode); form.reset(); onOpenChange(false); } }
    );
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="New Tax Rate" description="Create and select a tax rate without leaving the product." onSubmit={submit} isSubmitting={createMutation.isPending} submitLabel="Create Tax Rate">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Tax Code *</Label><Input autoFocus placeholder="e.g. VAT15" {...form.register("taxCode")} />{form.formState.errors.taxCode && <p className="text-xs text-destructive">{form.formState.errors.taxCode.message}</p>}</div>
        <div className="space-y-1.5"><Label>Tax Name *</Label><Input placeholder="e.g. VAT" {...form.register("taxName")} />{form.formState.errors.taxName && <p className="text-xs text-destructive">{form.formState.errors.taxName.message}</p>}</div>
        <div className="space-y-1.5"><Label>Percentage *</Label><Input type="number" min="0" step="0.01" {...form.register("percentage")} />{form.formState.errors.percentage && <p className="text-xs text-destructive">{form.formState.errors.percentage.message}</p>}</div>
        <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea rows={2} {...form.register("description")} /></div>
      </div>
    </FormDialog>
  );
}

function ItemHistoryDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { data: logs, isLoading } = useItemLogs(product?.itemCode);
  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change history — {product?.itemName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !logs || logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No changes recorded yet.</p>
          ) : (
            <div className="space-y-3 pr-2">
              {logs.map((log) => (
                <div key={log.logId} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{log.action}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(log.changedAt)}</span>
                  </div>
                  {(log.oldValue || log.newValue) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {log.oldValue && <span className="line-through">{log.oldValue}</span>} {log.newValue && <span className="text-foreground"> → {log.newValue}</span>}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">by {log.changedByName || log.changedBy}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
