"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowRight, Boxes, Receipt, ShoppingCart, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { BranchFilter } from "@/components/shared/branch-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAuthStore } from "@/store/auth-store";
import { useEffectiveBranchCode } from "@/store/auth-store";
import { canAccessReports } from "@/lib/permissions";
import { useDailySalesReport } from "@/hooks/use-misc";
import { useStockInventories } from "@/hooks/use-stock";
import { useCashierShifts } from "@/hooks/use-misc";
import { formatMoney, formatNumber, toDateOnly } from "@/lib/format";

function last7DaysRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { fromDate: toDateOnly(from), toDate: toDateOnly(to) };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const canSeeReports = canAccessReports(user?.roleName);
  const range = useMemo(() => last7DaysRange(), []);

  const dailyReport = useDailySalesReport({ ...range, branchCode }, canSeeReports);
  const lowStock = useStockInventories({ branchCode, onlyBelowReorderLevel: true });
  const openShifts = useCashierShifts({ branchCode, status: "Open" });

  const today = dailyReport.data?.days?.[dailyReport.data.days.length - 1];
  const chartData =
    dailyReport.data?.days.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      net: d.netSales,
    })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.fullName?.split(" ")[0] || user?.username}`}
        description="Here's what's happening across your business today."
        actions={<BranchFilter value={branchFilter} onChange={setBranchFilter} />}
      />

      {!canSeeReports ? (
        <CashierDashboard />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Net Sales Today"
              value={formatMoney(today?.netSales ?? 0)}
              icon={Receipt}
              tone="primary"
              isMoney
              hint={dailyReport.isLoading ? "Loading…" : `${today?.invoiceCount ?? 0} invoices`}
            />
            <StatCard
              label="Gross Sales (7 days)"
              value={formatMoney(dailyReport.data?.total?.grossSales ?? 0)}
              icon={ShoppingCart}
              tone="info"
              isMoney
            />
            <StatCard
              label="Low Stock Items"
              value={formatNumber(lowStock.data?.length ?? 0)}
              icon={Boxes}
              tone="warning"
              hint="Below reorder level"
            />
            <StatCard
              label="Open Cashier Shifts"
              value={formatNumber(openShifts.data?.length ?? 0)}
              icon={Wallet}
              tone="success"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Net Sales — Last 7 Days</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/reports">
                    Full report <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {dailyReport.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : dailyReport.isError ? (
                  <ErrorState message="Could not load the sales trend." onRetry={() => dailyReport.refetch()} />
                ) : chartData.length === 0 ? (
                  <EmptyState title="No sales yet" description="Once sales come in, your trend will show here." />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 10 }}>
                      <defs>
                        <linearGradient id="netSalesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => formatMoney(v)} />
                      <RTooltip
                        formatter={((v: unknown) => formatMoney(Number(v ?? 0))) as never}
                        contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="net" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#netSalesFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Low Stock Alerts</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/inventory/stock">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {lowStock.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : lowStock.isError ? (
                  <ErrorState message="Could not load stock levels." onRetry={() => lowStock.refetch()} />
                ) : (lowStock.data?.length ?? 0) === 0 ? (
                  <EmptyState icon={Boxes} title="Stock levels healthy" description="No items are below their reorder level." />
                ) : (
                  <div className="space-y-1">
                    {lowStock.data!.slice(0, 6).map((item) => (
                      <div key={item.stockId} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-secondary/50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.itemName || item.itemCode}</p>
                          <p className="text-xs text-muted-foreground">{item.branchCode} · {item.warehouseCode}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-warning">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span className="num text-sm font-semibold">{item.currentQty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Open Cashier Shifts</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/cash/shifts">
                  Manage shifts <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {openShifts.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (openShifts.data?.length ?? 0) === 0 ? (
                <EmptyState icon={Wallet} title="No open shifts" description="All cashier drawers are currently closed." />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {openShifts.data!.map((shift) => (
                    <div key={shift.shiftId} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{shift.cashierName || shift.cashierCode}</p>
                        <StatusBadge status={shift.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{shift.branchName || shift.branchCode}</p>
                      <p className="mt-2 num text-sm font-medium text-foreground">
                        Opening: {formatMoney(shift.openingCash)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function CashierDashboard() {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ShoppingCart className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">Ready to sell</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Head to the POS terminal to start ringing up sales, or check your cashier shift status.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button asChild>
          <Link href="/pos">
            Open POS Terminal <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/cash/shifts">My Shift</Link>
        </Button>
      </div>
    </Card>
  );
}
