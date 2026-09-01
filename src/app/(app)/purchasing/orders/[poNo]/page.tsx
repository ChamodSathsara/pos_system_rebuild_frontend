"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, Truck, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApprovePO, useCancelPO, usePurchaseOrder, usePurchaseOrderHistory, useRejectPO } from "@/hooks/use-purchase";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { canManagePurchasing } from "@/lib/permissions";

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ poNo: string }> }) {
  const { poNo } = use(params);
  const role = useAuthStore((s) => s.user?.roleName);
  const canManage = canManagePurchasing(role);

  const { data: po, isLoading, isError, refetch } = usePurchaseOrder(poNo);
  const { data: history } = usePurchaseOrderHistory(poNo);

  const approveM = useApprovePO();
  const rejectM = useRejectPO();
  const cancelM = useCancelPO();
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "cancel" | null>(null);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !po) return <ErrorState message="Could not load this purchase order." onRetry={refetch} />;

  const canCancel = po.status === "Open";
  const canApproveReject = po.status === "Open" || po.status === "PartiallyReceived";

  const runAction = () => {
    if (confirmAction === "approve") approveM.mutate({ poNo }, { onSuccess: () => setConfirmAction(null) });
    if (confirmAction === "reject") rejectM.mutate({ poNo }, { onSuccess: () => setConfirmAction(null) });
    if (confirmAction === "cancel") cancelM.mutate({ poNo }, { onSuccess: () => setConfirmAction(null) });
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/purchasing/orders"><ArrowLeft className="h-4 w-4" /> Back to Purchase Orders</Link>
        </Button>
        <PageHeader
          title={po.poNo}
          description={`${po.vendorName || po.vendorCode} · ${po.branchCode}`}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge status={po.status} />
              {canManage && po.status === "PartiallyReceived" && (
                <Button size="sm" asChild>
                  <Link href={`/purchasing/grn?poNo=${po.poNo}`}><Truck className="h-4 w-4" /> Receive (GRN)</Link>
                </Button>
              )}
              {canManage && po.status === "Open" && (
                <Button size="sm" asChild>
                  <Link href={`/purchasing/grn?poNo=${po.poNo}`}><Truck className="h-4 w-4" /> Receive (GRN)</Link>
                </Button>
              )}
              {canManage && canApproveReject && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmAction("approve")}>
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmAction("reject")}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </>
              )}
              {canManage && canCancel && (
                <Button size="sm" variant="destructive" onClick={() => setConfirmAction("cancel")}>
                  <Ban className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">PO Date</p><p className="mt-1 text-sm font-semibold">{formatDate(po.poDate)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Expected Date</p><p className="mt-1 text-sm font-semibold">{formatDate(po.expectedDate)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total Amount</p><p className="num mt-1 text-sm font-semibold">{formatMoney(po.totalAmount)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Created By</p><p className="mt-1 text-sm font-semibold">{po.createdBy || "—"}</p></Card>
      </div>

      {po.remarks && (
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Remarks</p>
          <p className="mt-1 text-sm text-foreground">{po.remarks}</p>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item) => {
                const pct = item.quantity ? Math.min(100, ((item.receivedQuantity ?? 0) / item.quantity) * 100) : 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.itemName || item.itemCode}</p>
                      <p className="text-xs text-muted-foreground">{item.itemCode}</p>
                    </TableCell>
                    <TableCell className="num">{item.quantity}</TableCell>
                    <TableCell className="num">{item.receivedQuantity ?? 0}</TableCell>
                    <TableCell className="w-32"><Progress value={pct} /></TableCell>
                    <TableCell className="num">{formatMoney(item.unitCost)}</TableCell>
                    <TableCell className="num">{formatMoney(item.totalCost ?? (item.quantity ?? 0) * (item.unitCost ?? 0))}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history recorded.</p>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.historyId} className="flex gap-3 border-l-2 border-border pl-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={h.action} />
                      <span className="text-xs text-muted-foreground">{formatDateTime(h.changedAt)}</span>
                    </div>
                    {h.remarks && <p className="mt-1 text-sm text-foreground">{h.remarks}</p>}
                    <p className="text-xs text-muted-foreground">by {h.changedBy}</p>
                    {h.changes?.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {h.changes.map((c) => (
                          <li key={c.id}>{c.field}: {c.oldValue ?? "—"} → {c.newValue ?? "—"}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        title={confirmAction === "approve" ? "Approve this purchase order?" : confirmAction === "reject" ? "Reject this purchase order?" : "Cancel this purchase order?"}
        description={confirmAction === "cancel" ? "This can only be done while the PO is Open and nothing has been received." : undefined}
        variant={confirmAction === "reject" || confirmAction === "cancel" ? "destructive" : "default"}
        confirmLabel={confirmAction === "approve" ? "Approve" : confirmAction === "reject" ? "Reject" : "Cancel PO"}
        loading={approveM.isPending || rejectM.isPending || cancelM.isPending}
        onConfirm={runAction}
      />
    </div>
  );
}
