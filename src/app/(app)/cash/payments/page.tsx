"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Ban } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCancelPayment, usePayments } from "@/hooks/use-sale";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { Payment } from "@/types";

export default function PaymentsPage() {
  const { data, isLoading, isError, refetch } = usePayments();
  const cancelM = useCancelPayment();
  const [cancelling, setCancelling] = useState<Payment | null>(null);

  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      { accessorKey: "invoiceNo", header: "Invoice" },
      { accessorKey: "paymentMethod", header: "Method", cell: ({ row }) => <Badge variant="outline">{row.original.paymentMethod}</Badge> },
      { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="num">{formatMoney(row.original.amount)}</span> },
      { accessorKey: "paymentDate", header: "Date", cell: ({ row }) => formatDateTime(row.original.paymentDate) },
      { accessorKey: "referenceNo", header: "Reference", cell: ({ row }) => row.original.referenceNo || "—" },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === "Completed" ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setCancelling(row.original)}>
              <Ban className="h-4 w-4" />
            </Button>
          ) : null,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="All payments recorded against sales." />
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search by invoice…" emptyTitle="No payments recorded" />
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel this payment?"
        description="This reverses the payment and updates the sale's balance."
        variant="destructive"
        confirmLabel="Cancel Payment"
        loading={cancelM.isPending}
        onConfirm={() => cancelling && cancelM.mutate({ id: cancelling.paymentId, body: {} }, { onSuccess: () => setCancelling(null) })}
      />
    </div>
  );
}
