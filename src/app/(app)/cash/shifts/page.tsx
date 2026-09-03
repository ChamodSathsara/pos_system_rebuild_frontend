"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { History, Lock, PlayCircle, RotateCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { BranchFilter } from "@/components/shared/branch-filter";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useCashierShiftHistory,
  useCashierShifts,
  useCloseShift,
  useOpenShift,
  useRecalculateShift,
} from "@/hooks/use-misc";
import { useAuthStore, useEffectiveBranchCode } from "@/store/auth-store";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ShiftDifferenceReasonType, type CashierShift } from "@/types";
import { toast } from "sonner";

export default function CashierShiftsPage() {
  const user = useAuthStore((s) => s.user);
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const { data, isLoading, isError, refetch } = useCashierShifts({ branchCode });

  const myOpenShift = data?.find((s) => s.cashierCode === user?.userCode && s.status === "Open");

  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [closeTarget, setCloseTarget] = useState<CashierShift | null>(null);
  const [historyFor, setHistoryFor] = useState<CashierShift | null>(null);
  const openM = useOpenShift();

  const columns = useMemo<ColumnDef<CashierShift>[]>(
    () => [
      { accessorKey: "cashierName", header: "Cashier", cell: ({ row }) => row.original.cashierName || row.original.cashierCode },
      { accessorKey: "branchName", header: "Branch", cell: ({ row }) => row.original.branchName || row.original.branchCode },
      { accessorKey: "openedAt", header: "Opened", cell: ({ row }) => formatDateTime(row.original.openedAt) },
      { accessorKey: "openingCash", header: "Opening", cell: ({ row }) => <span className="num">{formatMoney(row.original.openingCash)}</span> },
      { accessorKey: "expectedCash", header: "Expected", cell: ({ row }) => <span className="num">{formatMoney(row.original.expectedCash)}</span> },
      { accessorKey: "differenceAmount", header: "Difference", cell: ({ row }) => <span className={`num ${(row.original.differenceAmount ?? 0) !== 0 ? "text-warning" : ""}`}>{formatMoney(row.original.differenceAmount)}</span> },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistoryFor(row.original)}><History className="h-4 w-4" /></Button>
            {row.original.status === "Open" && row.original.cashierCode === user?.userCode && (
              <Button size="xs" variant="secondary" onClick={() => setCloseTarget(row.original)}><Lock className="h-3.5 w-3.5" /> Close</Button>
            )}
          </div>
        ),
      },
    ],
    [user?.userCode, setCloseTarget, setHistoryFor]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cashier Shifts"
        description="Open and reconcile cash drawer shifts."
        actions={
          <div className="flex items-center gap-2">
            <BranchFilter value={branchFilter} onChange={setBranchFilter} />
            {!myOpenShift && (
              <Button onClick={() => setOpenShiftDialog(true)}><PlayCircle className="h-4 w-4" /> Open My Shift</Button>
            )}
          </div>
        }
      />

      {myOpenShift && (
        <Card className="flex items-center justify-between border-success/30 bg-success/5 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Your shift is open</p>
            <p className="text-xs text-muted-foreground">Opened {formatDateTime(myOpenShift.openedAt)} with {formatMoney(myOpenShift.openingCash)}</p>
          </div>
          <Button size="sm" onClick={() => setCloseTarget(myOpenShift)}><Lock className="h-4 w-4" /> Close Shift</Button>
        </Card>
      )}

      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load." : null} onRetry={refetch} searchPlaceholder="Search by cashier…" emptyTitle="No shifts found" />

      <OpenShiftDialog open={openShiftDialog} onOpenChange={setOpenShiftDialog} defaultBranch={branchCode ?? user?.branchCode ?? undefined} onOpened={() => openM.reset()} />
      <CloseShiftDialog shift={closeTarget} onClose={() => setCloseTarget(null)} />
      <ShiftHistorySheet shift={historyFor} onClose={() => setHistoryFor(null)} />
    </div>
  );
}

function OpenShiftDialog({ open, onOpenChange, defaultBranch, onOpened }: { open: boolean; onOpenChange: (o: boolean) => void; defaultBranch?: string; onOpened: () => void }) {
  const openM = useOpenShift();
  const form = useForm({ defaultValues: { branchCode: defaultBranch ?? "", openingCash: "" } });

  const onSubmit = form.handleSubmit((v) => {
    if (!v.branchCode || !v.openingCash) {
      toast.error("Branch and opening cash are required.");
      return;
    }
    openM.mutate(
      { branchCode: v.branchCode, openingCash: Number(v.openingCash) },
      { onSuccess: () => { onOpenChange(false); onOpened(); form.reset(); } }
    );
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Open Cashier Shift" onSubmit={onSubmit} isSubmitting={openM.isPending} submitLabel="Open Shift">
      <div className="space-y-4">
        <div className="space-y-1.5"><Label>Branch Code *</Label><Input {...form.register("branchCode")} /></div>
        <div className="space-y-1.5"><Label>Opening Cash *</Label><Input type="number" step="0.01" {...form.register("openingCash")} /></div>
      </div>
    </FormDialog>
  );
}

function CloseShiftDialog({ shift, onClose }: { shift: CashierShift | null; onClose: () => void }) {
  const closeM = useCloseShift();
  const recalcM = useRecalculateShift();
  const form = useForm({ defaultValues: { actualCash: "", reasonType: "" as ShiftDifferenceReasonType | "", reasonDescription: "" } });

  if (!shift) return null;

  const submit = form.handleSubmit((v) => {
    if (!v.actualCash) {
      toast.error("Enter the actual counted cash.");
      return;
    }
    const actual = Number(v.actualCash);
    const expected = shift.expectedCash ?? shift.openingCash;
    const balanced = Math.abs(actual - expected) < 0.01;
    if (!balanced && !v.reasonType) {
      toast.error("A reason is required when actual cash doesn't match expected cash.");
      return;
    }
    closeM.mutate(
      { id: shift.shiftId, body: { actualCash: actual, reasonType: v.reasonType || null, reasonDescription: v.reasonDescription || null } },
      { onSuccess: () => { onClose(); form.reset(); } }
    );
  });

  const recalc = () => {
    if (!form.watch("actualCash")) {
      toast.error("Enter actual cash first.");
      return;
    }
    recalcM.mutate({ id: shift.shiftId, body: { actualCash: Number(form.watch("actualCash")) } });
  };

  return (
    <FormDialog open={!!shift} onOpenChange={(o) => !o && onClose()} title={`Close Shift — ${shift.cashierName || shift.cashierCode}`} onSubmit={submit} isSubmitting={closeM.isPending} submitLabel="Close Shift">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Card className="p-3"><p className="text-xs text-muted-foreground">Opening Cash</p><p className="num font-semibold">{formatMoney(shift.openingCash)}</p></Card>
          <Card className="p-3"><p className="text-xs text-muted-foreground">Expected Cash</p><p className="num font-semibold">{formatMoney(shift.expectedCash ?? shift.openingCash)}</p></Card>
        </div>
        <div className="space-y-1.5">
          <Label>Actual Cash Counted *</Label>
          <div className="flex gap-2">
            <Input type="number" step="0.01" {...form.register("actualCash")} />
            <Button type="button" variant="outline" onClick={recalc} disabled={recalcM.isPending}><RotateCw className="h-4 w-4" /> Recalculate</Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Reason (if there&apos;s a difference)</Label>
          <Select value={form.watch("reasonType")} onValueChange={(v) => form.setValue("reasonType", v as ShiftDifferenceReasonType)}>
            <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
            <SelectContent>
              {ShiftDifferenceReasonType.map((r) => <SelectItem key={r} value={r}>{r.replace(/([A-Z])/g, " $1").trim()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {form.watch("reasonType") === "Other" && (
          <div className="space-y-1.5"><Label>Description *</Label><Input {...form.register("reasonDescription")} /></div>
        )}
      </div>
    </FormDialog>
  );
}

function ShiftHistorySheet({ shift, onClose }: { shift: CashierShift | null; onClose: () => void }) {
  const { data: history } = useCashierShiftHistory(shift?.shiftId);
  return (
    <Sheet open={!!shift} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>Shift History — {shift?.cashierName || shift?.cashierCode}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          {!history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            history.map((h) => (
              <div key={h.historyId} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <StatusBadge status={h.action} />
                  <span className="text-xs text-muted-foreground">{formatDateTime(h.changedAt)}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                  <span>Exp: <span className="num text-foreground">{formatMoney(h.expectedCash)}</span></span>
                  <span>Actual: <span className="num text-foreground">{formatMoney(h.actualCash)}</span></span>
                  <span>Diff: <span className="num text-foreground">{formatMoney(h.differenceAmount)}</span></span>
                </div>
                {h.reasonDescription && <p className="mt-1 text-xs text-muted-foreground">{h.reasonDescription}</p>}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
