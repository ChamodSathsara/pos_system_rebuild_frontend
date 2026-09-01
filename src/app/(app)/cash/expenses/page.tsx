"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { BranchFilter } from "@/components/shared/branch-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useCreateExpense,
  useCreateExpenseCategory,
  useDeleteExpense,
  useExpenseCategories,
  useExpenses,
  useUpdateExpense,
} from "@/hooks/use-misc";
import { useEffectiveBranchCode } from "@/store/auth-store";
import { formatDate, formatMoney } from "@/lib/format";
import type { Expense } from "@/types";
import { toast } from "sonner";

export default function ExpensesPage() {
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const { data, isLoading, isError, refetch } = useExpenses({ branchCode });
  const { data: categories } = useExpenseCategories();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const createM = useCreateExpense();
  const updateM = useUpdateExpense();
  const deleteM = useDeleteExpense();

  const form = useForm({ defaultValues: { branchCode: branchCode ?? "", categoryId: "", amount: "", expenseDate: "", description: "" } });

  const openCreate = () => {
    setEditing(null);
    form.reset({ branchCode: branchCode ?? "", categoryId: "", amount: "", expenseDate: "", description: "" });
    setOpen(true);
  };
  const openEdit = (e: Expense) => {
    setEditing(e);
    form.reset({
      branchCode: e.branchCode ?? "",
      categoryId: e.categoryId ? String(e.categoryId) : "",
      amount: e.amount != null ? String(e.amount) : "",
      expenseDate: e.expenseDate ?? "",
      description: e.description ?? "",
    });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit((v) => {
    if (!v.branchCode || !v.categoryId || !v.amount) {
      toast.error("Branch, category and amount are required.");
      return;
    }
    const body = { branchCode: v.branchCode, categoryId: Number(v.categoryId), amount: Number(v.amount), expenseDate: v.expenseDate || null, description: v.description || null };
    if (editing) updateM.mutate({ id: editing.expenseId, body }, { onSuccess: () => setOpen(false) });
    else createM.mutate(body, { onSuccess: () => setOpen(false) });
  });

  const columns = useMemo<ColumnDef<Expense>[]>(
    () => [
      { accessorKey: "categoryName", header: "Category", cell: ({ row }) => row.original.categoryName || "—" },
      { accessorKey: "branchName", header: "Branch", cell: ({ row }) => row.original.branchName || row.original.branchCode },
      { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="num">{formatMoney(row.original.amount)}</span> },
      { accessorKey: "expenseDate", header: "Date", cell: ({ row }) => formatDate(row.original.expenseDate) },
      { accessorKey: "description", header: "Description", cell: ({ row }) => row.original.description || "—" },
      { accessorKey: "paidByName", header: "Paid By", cell: ({ row }) => row.original.paidByName || row.original.paidBy || "—" },
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
        title="Expenses"
        description="Track day-to-day cash expenses per branch."
        actions={
          <div className="flex items-center gap-2">
            <BranchFilter value={branchFilter} onChange={setBranchFilter} />
            <Button variant="outline" onClick={() => setCategoriesOpen(true)}><Settings2 className="h-4 w-4" /> Categories</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Expense</Button>
          </div>
        }
      />

      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search expenses…" emptyTitle="No expenses recorded" />

      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Edit Expense" : "New Expense"} onSubmit={onSubmit} isSubmitting={createM.isPending || updateM.isPending} submitLabel={editing ? "Save" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Branch Code *</Label><Input {...form.register("branchCode")} /></div>
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={form.watch("categoryId")} onValueChange={(v) => form.setValue("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories?.map((c) => <SelectItem key={c.categoryId} value={String(c.categoryId)}>{c.categoryName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Amount *</Label><Input type="number" step="0.01" {...form.register("amount")} /></div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" {...form.register("expenseDate")} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea rows={2} {...form.register("description")} /></div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this expense?"
        variant="destructive"
        confirmLabel="Delete"
        loading={deleteM.isPending}
        onConfirm={() => deleting && deleteM.mutate(deleting.expenseId, { onSuccess: () => setDeleting(null) })}
      />

      <ExpenseCategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
    </div>
  );
}

function ExpenseCategoriesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: categories, isLoading } = useExpenseCategories();
  const createM = useCreateExpenseCategory();
  const form = useForm({ defaultValues: { categoryName: "", description: "" } });

  const onSubmit = form.handleSubmit((v) => {
    if (!v.categoryName) return;
    createM.mutate({ categoryName: v.categoryName, description: v.description || null }, { onSuccess: () => form.reset() });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Expense Categories</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input placeholder="New category name" {...form.register("categoryName")} />
          <Button type="submit" disabled={createM.isPending}><Plus className="h-4 w-4" /> Add</Button>
        </form>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-6">Loading…</TableCell></TableRow>
            ) : categories && categories.length > 0 ? (
              categories.map((c) => (
                <TableRow key={c.categoryId}><TableCell>{c.categoryName}</TableCell><TableCell className="text-muted-foreground">{c.description || "—"}</TableCell></TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-6">No categories yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
