"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Ban } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { BranchFilter } from "@/components/shared/branch-filter";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCancelSale, useSales } from "@/hooks/use-sale";
import { useEffectiveBranchCode } from "@/store/auth-store";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { Sale, SaleStatus } from "@/types";

const STATUS_OPTIONS: (SaleStatus | "All")[] = ["All", "Pending", "Completed", "Cancelled", "Refunded"];

export default function SalesPage() {
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const [status, setStatus] = useState<SaleStatus | "All">("All");
  const { data, isLoading, isError, refetch } = useSales({ branchCode, status: status === "All" ? undefined : status });
  const cancelM = useCancelSale();
  const [cancelling, setCancelling] = useState<Sale | null>(null);

  const columns = useMemo<ColumnDef<Sale>[]>(
    () => [
      { accessorKey: "invoiceNo", header: "Invoice", cell: ({ row }) => <Link href={`/sales/${row.original.invoiceNo}`} className="font-medium text-primary hover:underline">{row.original.invoiceNo}</Link> },
      { accessorKey: "saleDate", header: "Date", cell: ({ row }) => formatDateTime(row.original.saleDate) },
      { accessorKey: "customerName", header: "Customer", cell: ({ row }) => row.original.customerName || "Walk-in" },
      { accessorKey: "branchCode", header: "Branch" },
      { accessorKey: "totalAmount", header: "Total", cell: ({ row }) => <span className="num">{formatMoney(row.original.totalAmount)}</span> },
      { accessorKey: "balanceAmount", header: "Balance", cell: ({ row }) => <span className="num">{formatMoney(row.original.balanceAmount)}</span> },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === "Completed" ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setCancelling(row.original)} title="Cancel sale">
              <Ban className="h-4 w-4" />
            </Button>
          ) : null,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="All completed and pending sales transactions."
        actions={
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as SaleStatus | "All")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : s}</SelectItem>)}
              </SelectContent>
            </Select>
            <BranchFilter value={branchFilter} onChange={setBranchFilter} />
          </div>
        }
      />

      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load sales." : null} onRetry={refetch} searchPlaceholder="Search invoice or customer…" emptyTitle="No sales found" />

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title={`Cancel sale ${cancelling?.invoiceNo}?`}
        description="This voids the sale and restores stock. This can't be undone."
        variant="destructive"
        confirmLabel="Cancel Sale"
        loading={cancelM.isPending}
        onConfirm={() => cancelling && cancelM.mutate(cancelling.invoiceNo, { onSuccess: () => setCancelling(null) })}
      />
    </div>
  );
}
