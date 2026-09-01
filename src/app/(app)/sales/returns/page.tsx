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
import { useCreateSaleReturn, useSale, useSaleReturns } from "@/hooks/use-sale";
import { formatDate, formatMoney } from "@/lib/format";
import type { SaleReturn } from "@/types";
import { toast } from "sonner";

export default function SaleReturnsPage() {
  const { data, isLoading, isError, refetch } = useSaleReturns();
  const [open, setOpen] = useState(false);

  const columns = useMemo<ColumnDef<SaleReturn>[]>(
    () => [
      { accessorKey: "returnNo", header: "Return No." },
      { accessorKey: "invoiceNo", header: "Invoice" },
      { accessorKey: "returnDate", header: "Date", cell: ({ row }) => formatDate(row.original.returnDate) },
      { accessorKey: "reason", header: "Reason", cell: ({ row }) => row.original.reason || "—" },
      { accessorKey: "totalReturnAmount", header: "Amount", cell: ({ row }) => <span className="num">{formatMoney(row.original.totalReturnAmount)}</span> },
      { accessorKey: "createdBy", header: "By" },
    ],
    []
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
  const { data: sale, isLoading, isError } = useSale(searchTerm || undefined);
  const [selected, setSelected] = useState<Record<string, string>>({}); // itemCode -> qty string
  const createM = useCreateSaleReturn();
  const form = useForm({ defaultValues: { reason: "" } });

  const doLookup = () => {
    if (!lookupInvoice) return;
    setSearchTerm(lookupInvoice.trim());
    setSelected({});
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
    const items = Object.entries(selected)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([itemCode, qty]) => ({ itemCode, quantity: Number(qty) }));
    if (items.length === 0) {
      toast.error("Select at least one item to return.");
      return;
    }
    createM.mutate(
      { returnNo: null, invoiceNo: sale.invoiceNo, reason: v.reason || null, items },
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
      <div className="flex gap-2">
        <Input placeholder="Invoice number, e.g. INV000001" value={lookupInvoice} onChange={(e) => setLookupInvoice(e.target.value)} />
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
            <Label>Reason</Label>
            <Textarea rows={2} {...form.register("reason")} />
          </div>
        </div>
      )}
    </FormDialog>
  );
}
