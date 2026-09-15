"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateSaleReturn, useSale, useSaleReturns, useSales } from "@/hooks/use-sale";
import { useSystemUsers } from "@/hooks/use-security";
import { formatDate, formatMoney } from "@/lib/format";
import type { SaleReturn } from "@/types";
import { toast } from "sonner";

export default function SaleReturnsPage() {
  const { data, isLoading, isError, refetch } = useSaleReturns();
  const { data: users } = useSystemUsers();
  const [open, setOpen] = useState(false);

  const columns = useMemo<ColumnDef<SaleReturn>[]>(
    () => [
      { accessorKey: "returnNo", header: "Return No." },
      { accessorKey: "invoiceNo", header: "Invoice" },
      { accessorKey: "returnDate", header: "Date", cell: ({ row }) => formatDate(row.original.returnDate) },
      { accessorKey: "reason", header: "Reason", cell: ({ row }) => row.original.reason || "—" },
      { accessorKey: "totalReturnAmount", header: "Amount", cell: ({ row }) => <span className="num">{formatMoney(row.original.totalReturnAmount)}</span> },
      { accessorKey: "createdBy", header: "By", cell: ({ row }) => users?.find((user) => user.userCode === row.original.createdBy)?.fullName || users?.find((user) => user.userCode === row.original.createdBy)?.username || row.original.createdBy || "—" },
    ],
    [users]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sale Returns"
        description="Process returns against completed sales."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Return</Button>}
      />

      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search return or invoice number…" emptyTitle="No returns recorded" />

      <CreateReturnDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreateReturnDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [lookupInvoice, setLookupInvoice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInvoices, setShowInvoices] = useState(false);
  const { data: sale, isLoading, isError } = useSale(searchTerm || undefined);
  const { data: completedSales, isLoading: invoicesLoading } = useSales({ status: "Completed" });
  const [selected, setSelected] = useState<Record<string, string>>({}); // itemCode -> qty string
  const createM = useCreateSaleReturn();
  const form = useForm({ defaultValues: { reason: "" } });

  const doLookup = () => {
    if (!lookupInvoice) return;
    setSearchTerm(lookupInvoice.trim());
    setSelected({});
  };
  const invoiceMatches = (completedSales ?? []).filter((completedSale) => {
    const term = lookupInvoice.trim().toLowerCase();
    return !!term && (completedSale.invoiceNo.toLowerCase().includes(term) || completedSale.customerName?.toLowerCase().includes(term));
  }).slice(0, 10);
  const selectInvoice = (invoiceNo: string) => {
    setLookupInvoice(invoiceNo);
    setSearchTerm(invoiceNo);
    setSelected({});
    setShowInvoices(false);
  };

  const toggleItem = (itemCode: string, maxQty: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (itemCode in next) delete next[itemCode];
      else next[itemCode] = String(maxQty);
      return next;
    });
  };

  const submit = form.handleSubmit((v) => {
    if (!sale) return;
    if (!v.reason.trim()) {
      form.setError("reason", { message: "Return reason is required." });
      toast.error("Enter a reason for this sale return.");
      return;
    }
    const items = Object.entries(selected)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([itemCode, qty]) => ({ itemCode, quantity: Number(qty) }));
    if (items.length === 0) {
      toast.error("Select at least one item to return.");
      return;
    }
    createM.mutate(
      { returnNo: null, invoiceNo: sale.invoiceNo, reason: v.reason.trim(), items },
      {
        onSuccess: () => {
          onOpenChange(false);
          setLookupInvoice("");
          setSearchTerm("");
          setSelected({});
          form.reset();
        },
      }
    );
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="New Sale Return" onSubmit={submit} isSubmitting={createM.isPending} submitLabel="Process Return" className="sm:max-w-lg">
      <div className="relative flex gap-2">
        <div className="relative min-w-0 flex-1">
        <Input placeholder="Search invoice number or customer" value={lookupInvoice} onFocus={() => setShowInvoices(true)} onChange={(e) => { setLookupInvoice(e.target.value); setShowInvoices(true); }} />
        {showInvoices && lookupInvoice.trim() && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">{invoicesLoading ? <p className="px-2 py-3 text-sm text-muted-foreground">Loading invoices...</p> : invoiceMatches.length > 0 ? invoiceMatches.map((completedSale) => <button key={completedSale.invoiceNo} type="button" className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted" onMouseDown={(event) => event.preventDefault()} onClick={() => selectInvoice(completedSale.invoiceNo)}><span className="block font-medium">{completedSale.invoiceNo}</span><span className="text-xs text-muted-foreground">{completedSale.customerName || "Walk-in"} · {formatMoney(completedSale.totalAmount)}</span></button>) : <p className="px-2 py-3 text-sm text-muted-foreground">No completed invoices found.</p>}</div>}
        </div>
        <Button type="button" variant="outline" onClick={doLookup}><Search className="h-4 w-4" /> Find</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Looking up sale…</p>}
      {isError && searchTerm && <p className="text-sm text-destructive">Sale not found.</p>}

      {sale && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{sale.customerName || "Walk-in"} · {formatMoney(sale.totalAmount)} total</p>
          <div className="space-y-1.5 rounded-lg border border-border p-2">
            {sale.items.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-secondary/50">
                <Checkbox checked={item.itemCode! in selected} onCheckedChange={() => toggleItem(item.itemCode!, item.quantity ?? 1)} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.itemName}</p>
                  <p className="text-xs text-muted-foreground">Sold qty: {item.quantity}</p>
                </div>
                {item.itemCode! in selected && (
                  <Input
                    type="number"
                    className="h-8 w-20"
                    min={0}
                    max={item.quantity ?? undefined}
                    value={selected[item.itemCode!]}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [item.itemCode!]: e.target.value }))}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <Textarea rows={2} {...form.register("reason", { validate: (value) => value.trim().length > 0 || "Return reason is required." })} />
            {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
          </div>
        </div>
      )}
    </FormDialog>
  );
}
