"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCashierShifts, useCloseShift, useOpenShift, useRecalculateShift } from "@/hooks/use-misc";
import { formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { ShiftDifferenceReasonType, type CashierShift } from "@/types";
import { toast } from "sonner";

interface CashierShiftContextValue {
  requestLogout?: () => void;
}

const CashierShiftContext = createContext<CashierShiftContextValue>({});

export function useCashierShiftSession() {
  return useContext(CashierShiftContext);
}

function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

export function CashierShiftGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isCashier = user?.roleName === "Cashier";
  const branchCode = user?.branchCode ?? "";
  const cashierCode = user?.userCode ?? "";
  const shifts = useCashierShifts(
    { branchCode: branchCode || undefined, cashierCode: cashierCode || undefined },
    isCashier && !!branchCode && !!cashierCode
  );
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const openShift = shifts.data?.find((shift) => shift.status === "Open");
  const closedToday = shifts.data?.some((shift) => shift.status === "Closed" && isToday(shift.closedAt));

  const finishLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    router.replace("/login");
  }, [loggingOut, logout, router]);

  useEffect(() => {
    if (isCashier && shifts.isSuccess && closedToday && !openShift) {
      const timer = setTimeout(() => void finishLogout(), 0);
      return () => clearTimeout(timer);
    }
  }, [closedToday, finishLogout, isCashier, openShift, shifts.isSuccess]);

  const contextValue = useMemo<CashierShiftContextValue>(() => ({
    requestLogout: isCashier ? () => setCashOutOpen(true) : undefined,
  }), [isCashier]);

  if (!isCashier) {
    return <CashierShiftContext.Provider value={contextValue}>{children}</CashierShiftContext.Provider>;
  }

  if (!branchCode) {
    return <LockedMessage message="Your cashier account is not assigned to a branch. Contact an administrator." />;
  }

  if (shifts.isLoading || loggingOut || (shifts.isSuccess && closedToday && !openShift)) {
    return <LockedMessage loading message={loggingOut ? "Signing out..." : "Checking your cash shift..."} />;
  }

  if (shifts.isError) {
    return <LockedMessage message="Could not verify your cash shift. Operations are locked until the check succeeds." onRetry={shifts.refetch} />;
  }

  if (!openShift) {
    return <CashInDialog branchCode={branchCode} />;
  }

  return (
    <CashierShiftContext.Provider value={contextValue}>
      {children}
      <CashOutDialog shift={openShift} open={cashOutOpen} onOpenChange={setCashOutOpen} onClosed={finishLogout} />
    </CashierShiftContext.Provider>
  );
}

function LockedMessage({ message, loading = false, onRetry }: { message: string; loading?: boolean; onRetry?: () => void }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md space-y-4 p-6 text-center">
      {loading ? <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /> : <LockKeyhole className="mx-auto h-7 w-7 text-warning" />}
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && <Button type="button" onClick={onRetry}>Try Again</Button>}
    </Card>
  </div>;
}

function CashInDialog({ branchCode }: { branchCode: string }) {
  const openShift = useOpenShift();
  const [openingCash, setOpeningCash] = useState("");

  const submit = () => {
    const amount = Number(openingCash);
    if (openingCash.trim() === "" || !Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid Cash In amount.");
      return;
    }
    openShift.mutate({ branchCode, openingCash: amount });
  };

  return <Dialog open>
    <DialogContent hideClose onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
      <DialogHeader><DialogTitle>Cash In Required</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Enter the opening cash float before starting cashier operations for today.</p>
      <div className="space-y-1.5">
        <Label htmlFor="mandatory-cash-in">Cash In *</Label>
        <Input id="mandatory-cash-in" type="number" min="0" step="0.01" autoFocus value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} />
      </div>
      <DialogFooter>
        <Button type="button" disabled={openShift.isPending} onClick={submit}>
          {openShift.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Start Day
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

function CashOutDialog({ shift, open, onOpenChange, onClosed }: { shift: CashierShift; open: boolean; onOpenChange: (open: boolean) => void; onClosed: () => Promise<void> }) {
  const recalculate = useRecalculateShift();
  const closeShift = useCloseShift();
  const [actualCash, setActualCash] = useState("");
  const [checkedShift, setCheckedShift] = useState<CashierShift | null>(null);
  const [reasonType, setReasonType] = useState<ShiftDifferenceReasonType | "">("");
  const [reasonDescription, setReasonDescription] = useState("");
  const busy = recalculate.isPending || closeShift.isPending;

  const amount = Number(actualCash);
  const validAmount = actualCash.trim() !== "" && Number.isFinite(amount) && amount >= 0;

  const checkAndClose = () => {
    if (!validAmount) {
      toast.error("Enter a valid Cash Out amount.");
      return;
    }
    recalculate.mutate({ id: shift.shiftId, body: { actualCash: amount } }, {
      onSuccess: (result) => {
        if (result.status === "Closed") {
          void onClosed();
          return;
        }
        setCheckedShift(result);
        toast.warning("Cash does not match the expected amount. Select a reason to close the shift.");
      },
    });
  };

  const closeWithDifference = () => {
    if (!checkedShift || !reasonType) {
      toast.error("Select a difference reason.");
      return;
    }
    if (reasonType === "Other" && !reasonDescription.trim()) {
      toast.error("Enter a description for the difference.");
      return;
    }
    closeShift.mutate({
      id: shift.shiftId,
      body: { actualCash: amount, reasonType, reasonDescription: reasonDescription.trim() || null },
    }, { onSuccess: () => void onClosed() });
  };

  return <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
    <DialogContent hideClose={busy} onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Cash Out Before Sign Out</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Count the cash drawer and close your shift before signing out.</p>
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Opening Cash</p><p className="num font-semibold">{formatMoney(shift.openingCash)}</p></Card>
        {checkedShift && <Card className="p-3"><p className="text-xs text-muted-foreground">Expected Cash</p><p className="num font-semibold">{formatMoney(checkedShift.expectedCash)}</p></Card>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mandatory-cash-out">Cash Out *</Label>
        <Input id="mandatory-cash-out" type="number" min="0" step="0.01" value={actualCash} onChange={(event) => { setActualCash(event.target.value); setCheckedShift(null); setReasonType(""); }} />
      </div>
      {checkedShift && (
        <>
          <Card className="border-warning/30 bg-warning/5 p-3 text-sm">
            Difference: <span className="num font-semibold text-warning">{formatMoney(checkedShift.differenceAmount)}</span>
          </Card>
          <div className="space-y-1.5">
            <Label>Difference Reason *</Label>
            <Select value={reasonType} onValueChange={(value) => setReasonType(value as ShiftDifferenceReasonType)}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>{ShiftDifferenceReasonType.map((reason) => <SelectItem key={reason} value={reason}>{reason.replace(/([A-Z])/g, " $1").trim()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {reasonType === "Other" && <div className="space-y-1.5"><Label>Description *</Label><Input value={reasonDescription} onChange={(event) => setReasonDescription(event.target.value)} /></div>}
        </>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="button" variant="destructive" disabled={busy} onClick={checkedShift ? closeWithDifference : checkAndClose}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {checkedShift ? "Close Shift & Sign Out" : "Check Cash & Sign Out"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
