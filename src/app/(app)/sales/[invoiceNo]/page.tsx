"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCancelSale, useSale, useSaleInvoice } from "@/hooks/use-sale";
import { usePayments } from "@/hooks/use-sale";
import { formatDateTime, formatMoney } from "@/lib/format";

export default function SaleDetailPage({ params }: { params: Promise<{ invoiceNo: string }> }) {
  const { invoiceNo } = use(params);
  const { data: sale, isLoading, isError, refetch } = useSale(invoiceNo);
  const { data: payments } = usePayments({ invoiceNo });
  const { data: invoice } = useSaleInvoice(invoiceNo);
  const cancelM = useCancelSale();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !sale) return <ErrorState message="Could not load this sale." onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/sales"><ArrowLeft className="h-4 w-4" /> Back to Sales</Link>
        </Button>
        <PageHeader
          title={sale.invoiceNo}
          description={`${sale.customerName || "Walk-in customer"} · ${sale.branchCode}`}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge status={sale.status} />
              <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print Invoice</Button>
              {sale.status === "Completed" && (
                <Button size="sm" variant="destructive" onClick={() => setConfirmCancel(true)}><Ban className="h-4 w-4" /> Cancel Sale</Button>
              )}
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Date</p><p className="mt-1 text-sm font-semibold">{formatDateTime(sale.saleDate)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="num mt-1 text-sm font-semibold">{formatMoney(sale.totalAmount)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="num mt-1 text-sm font-semibold text-success">{formatMoney(sale.paidAmount)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Balance</p><p className="num mt-1 text-sm font-semibold text-warning">{formatMoney(sale.balanceAmount)}</p></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><p className="font-medium">{item.itemName || item.itemCode}</p><p className="text-xs text-muted-foreground">{item.itemCode}</p></TableCell>
                  <TableCell className="num">{item.quantity}</TableCell>
                  <TableCell className="num">{formatMoney(item.unitPrice)}</TableCell>
                  <TableCell className="num">{formatMoney(item.discountAmount)}</TableCell>
                  <TableCell className="num">{formatMoney(item.taxAmount)}</TableCell>
                  <TableCell className="num font-medium">{formatMoney(item.totalPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.paymentId}>
                    <TableCell><Badge variant="outline">{p.paymentMethod}</Badge></TableCell>
                    <TableCell className="num">{formatMoney(p.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.referenceNo || "—"}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={`Cancel sale ${sale.invoiceNo}?`}
        description="This voids the sale and restores stock. This can't be undone."
        variant="destructive"
        confirmLabel="Cancel Sale"
        loading={cancelM.isPending}
        onConfirm={() => cancelM.mutate(sale.invoiceNo, { onSuccess: () => setConfirmCancel(false) })}
      />
    </div>
  );
}
