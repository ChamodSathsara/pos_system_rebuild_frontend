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
import { useCreateDiscount, useDeleteDiscount, useDiscounts, useUpdateDiscount } from "@/hooks/use-misc";
import { DiscountMethod, DiscountType, type Discount } from "@/types";
import { formatMoney } from "@/lib/format";

type FieldRule = "required" | "optional" | "hide";
interface DiscountFieldRules {
  itemCode: FieldRule;
  minQuantity: FieldRule;
  startDate: FieldRule;
  endDate: FieldRule;
  minBillAmount: FieldRule;
}

// Field visibility exactly mirrors backend DiscountsController validation comment.
function fieldsFor(type: DiscountType): DiscountFieldRules {
  switch (type) {
    case "Item":
      return { itemCode: "required", minQuantity: "hide", startDate: "optional", endDate: "optional", minBillAmount: "hide" };
    case "Item_Quantity":
      return { itemCode: "required", minQuantity: "required", startDate: "optional", endDate: "optional", minBillAmount: "hide" };
    case "Seasonal":
      return { itemCode: "hide", minQuantity: "hide", startDate: "required", endDate: "required", minBillAmount: "hide" };
    case "Total_Bill":
      return { itemCode: "hide", minQuantity: "hide", startDate: "hide", endDate: "hide", minBillAmount: "required" };
    case "Special":
      return { itemCode: "required", minQuantity: "hide", startDate: "required", endDate: "required", minBillAmount: "hide" };
  }
}

interface FormValues {
  discountName: string;
  discountType: DiscountType;
  discountMethod: DiscountMethod;
  discountValue: number;
  itemCode: string;
  minQuantity: string;
  startDate: string;
  endDate: string;
  minBillAmount: string;
  isActive: boolean;
}

export default function DiscountsPage() {
  const { data, isLoading, isError, refetch } = useDiscounts();
  const createM = useCreateDiscount();
  const updateM = useUpdateDiscount();
  const deleteM = useDeleteDiscount();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [deleting, setDeleting] = useState<Discount | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      discountName: "",
      discountType: "Item",
      discountMethod: "Percentage",
      discountValue: 0,
      itemCode: "",
      minQuantity: "",
      startDate: "",
      endDate: "",
      minBillAmount: "",
      isActive: true,
    },
  });
  const type = form.watch("discountType");
  const rules = fieldsFor(type);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      discountName: "",
      discountType: "Item",
      discountMethod: "Percentage",
      discountValue: 0,
      itemCode: "",
      minQuantity: "",
      startDate: "",
      endDate: "",
      minBillAmount: "",
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditing(d);
    form.reset({
      discountName: d.discountName,
      discountType: d.discountType,
      discountMethod: d.discountMethod,
      discountValue: d.discountValue ?? 0,
      itemCode: d.itemCode ?? "",
      minQuantity: d.minQuantity != null ? String(d.minQuantity) : "",
      startDate: d.startDate ?? "",
      endDate: d.endDate ?? "",
      minBillAmount: d.minBillAmount != null ? String(d.minBillAmount) : "",
      isActive: d.isActive,
    });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    const r = fieldsFor(v.discountType);
    const base = {
      discountName: v.discountName,
      discountMethod: v.discountMethod,
      discountValue: Number(v.discountValue),
      itemCode: r.itemCode === "hide" ? null : v.itemCode || null,
      minQuantity: r.minQuantity === "hide" ? null : v.minQuantity ? Number(v.minQuantity) : null,
      startDate: r.startDate === "hide" ? null : v.startDate || null,
      endDate: r.endDate === "hide" ? null : v.endDate || null,
      minBillAmount: r.minBillAmount === "hide" ? null : v.minBillAmount ? Number(v.minBillAmount) : null,
      isActive: v.isActive,
    };
    if (editing) {
      updateM.mutate({ code: editing.discountCode, body: base }, { onSuccess: () => setOpen(false) });
    } else {
      createM.mutate({ discountCode: null, discountType: v.discountType, ...base }, { onSuccess: () => setOpen(false) });
    }
  });

  const columns = useMemo<ColumnDef<Discount>[]>(
    () => [
      { accessorKey: "discountCode", header: "Code" },
      { accessorKey: "discountName", header: "Name" },
      { accessorKey: "discountType", header: "Type", cell: ({ row }) => <Badge variant="outline">{row.original.discountType.replace(/_/g, " ")}</Badge> },
      {
        accessorKey: "discountValue",
        header: "Value",
        cell: ({ row }) =>
          row.original.discountMethod === "Percentage" ? `${row.original.discountValue}%` : formatMoney(row.original.discountValue),
      },
      { accessorKey: "applicableTo", header: "Applies To", cell: ({ row }) => row.original.applicableTo.replace(/_/g, " ") },
      { accessorKey: "isActive", header: "Status", cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "secondary"}>{row.original.isActive ? "Active" : "Inactive"}</Badge> },
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
    <div className="space-y-6">
      <PageHeader
        title="Discounts"
        description="Configure item, quantity, seasonal, and bill-level promotions."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New Discount</Button>}
      />

      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search discounts…" emptyTitle="No discounts configured" />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${editing.discountCode}` : "New Discount"}
        onSubmit={onSubmit}
        isSubmitting={createM.isPending || updateM.isPending}
        submitLabel={editing ? "Save" : "Create"}
        className="sm:max-w-lg"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Discount Name *</Label>
            <Input {...form.register("discountName", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Discount Type *</Label>
              <Select value={type} onValueChange={(v) => form.setValue("discountType", v as DiscountType)} disabled={!!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DiscountType.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              {editing && <p className="text-xs text-muted-foreground">Type can&apos;t be changed after creation.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Method *</Label>
              <Select value={form.watch("discountMethod")} onValueChange={(v) => form.setValue("discountMethod", v as DiscountMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DiscountMethod.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Discount Value * {form.watch("discountMethod") === "Percentage" ? "(%)" : "(amount)"}</Label>
            <Input type="number" step="0.01" {...form.register("discountValue", { required: true, valueAsNumber: true })} />
          </div>

          {rules.itemCode !== "hide" && (
            <div className="space-y-1.5">
              <Label>Item Code {rules.itemCode === "required" && "*"}</Label>
              <Input placeholder="e.g. ITM00012" {...form.register("itemCode")} />
            </div>
          )}
          {rules.minQuantity !== "hide" && (
            <div className="space-y-1.5">
              <Label>Minimum Quantity {rules.minQuantity === "required" && "*"}</Label>
              <Input type="number" step="0.01" {...form.register("minQuantity")} />
            </div>
          )}
          {rules.minBillAmount !== "hide" && (
            <div className="space-y-1.5">
              <Label>Minimum Bill Amount {rules.minBillAmount === "required" && "*"}</Label>
              <Input type="number" step="0.01" {...form.register("minBillAmount")} />
            </div>
          )}
          {(rules.startDate !== "hide" || rules.endDate !== "hide") && (
            <div className="grid grid-cols-2 gap-4">
              {rules.startDate !== "hide" && (
                <div className="space-y-1.5">
                  <Label>Start Date {rules.startDate === "required" && "*"}</Label>
                  <Input type="date" {...form.register("startDate")} />
                </div>
              )}
              {rules.endDate !== "hide" && (
                <div className="space-y-1.5">
                  <Label>End Date {rules.endDate === "required" && "*"}</Label>
                  <Input type="date" {...form.register("endDate")} />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} />
            <Label>Active</Label>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.discountName}?`}
        variant="destructive"
        confirmLabel="Delete"
        loading={deleteM.isPending}
        onConfirm={() => deleting && deleteM.mutate(deleting.discountCode, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
