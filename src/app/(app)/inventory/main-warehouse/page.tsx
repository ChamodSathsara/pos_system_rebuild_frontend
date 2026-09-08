"use client";
import Link from "next/link";
import { AlertTriangle, Boxes, ClipboardList, PackagePlus, Truck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useWarehouse } from "@/hooks/use-organization";
import { useDamageItems, useStockInventories } from "@/hooks/use-stock";
import { useStockTransfers } from "@/hooks/use-stock-transfer";
import { useAuthStore } from "@/store/auth-store";
import { formatDate, formatMoney } from "@/lib/format";
import { TransferWorkspace } from "@/components/stock-transfers/transfer-workspace";

export default function CentralWarehouseDashboard() {
  const user = useAuthStore((state) => state.user); const code = user?.warehouseCode ?? "";
  const warehouse = useWarehouse(code); const stock = useStockInventories({ warehouseCode: code }, !!code); const lowStock = useStockInventories({ warehouseCode: code, onlyBelowReorderLevel: true }, !!code); const damage = useDamageItems({ warehouseCode: code }, !!code); const transfers = useStockTransfers({ sourceWarehouseCode: code }, !!code);
  if (user?.roleName !== "InventoryClerk") return <TransferWorkspace mode="queue" />;
  if (!code) return <AssignmentError />;
  if (warehouse.data && !warehouse.data.isCentralWarehouse) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h1 className="text-lg font-semibold text-destructive">Assigned warehouse is not a Central Warehouse.</h1><p className="mt-1 text-sm text-muted-foreground">Contact Admin to correct this Inventory Clerk assignment.</p></div>;
  const stocks = stock.data ?? []; const damages = damage.data ?? []; const requests = transfers.data ?? [];
  const recentDamage = [...damages].sort((a, b) => String(b.damageDate).localeCompare(String(a.damageDate))).slice(0, 5);
  const metrics = [["Total Items", stocks.length], ["Total Quantity", stocks.reduce((sum, item) => sum + item.currentQty, 0)], ["Low Stock", lowStock.data?.length ?? 0], ["Recent Damage", recentDamage.length], ["Pending Transfer Requests", requests.filter((item) => ["Submitted", "Accepted", "Picking"].includes(item.status)).length], ["Dispatched Transfers", requests.filter((item) => ["Dispatched", "Received"].includes(item.status)).length], ["Awaiting Branch Receipts", requests.filter((item) => item.status === "Dispatched").length]] as const;
  const loading = warehouse.isLoading || stock.isLoading || lowStock.isLoading || damage.isLoading || transfers.isLoading; const failed = warehouse.isError || stock.isError || lowStock.isError || damage.isError || transfers.isError;
  return <div className="space-y-6">
    <PageHeader title="Main Warehouse Dashboard" description={warehouse.data ? `${warehouse.data.warehouseName} (${warehouse.data.warehouseCode}) · ${warehouse.data.address || "No address recorded"}` : `Assigned warehouse: ${code}`} actions={<div className="flex gap-2"><Button asChild variant="outline"><Link href="/inventory/central-damage"><AlertTriangle /> Damage</Link></Button><Button asChild><Link href="/inventory/central-stock-in"><PackagePlus /> Stock In</Link></Button></div>} />
    {failed && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Central Warehouse information could not be loaded. Check the API connection and try again.</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{loading ? "..." : value}</p></div>)}</div>
    <div className="grid gap-4 xl:grid-cols-2"><div className="rounded-xl border bg-card p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent Damage</h2><Button asChild size="sm" variant="ghost"><Link href="/inventory/central-damage">View all</Link></Button></div>{recentDamage.length ? <div className="space-y-2">{recentDamage.map((item) => <div key={item.damageId} className="flex justify-between rounded-lg border p-3 text-sm"><div><p className="font-medium">{item.itemName || item.itemCode}</p><p className="text-muted-foreground">{item.reason || "No reason"} · {formatDate(item.damageDate)}</p></div><div className="text-right"><p>{item.quantity ?? 0}</p><p className="text-xs text-muted-foreground">{formatMoney(item.costAmount)}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">No Central Warehouse damage recorded.</p>}</div>
    <div className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-semibold">Central Operations</h2><div className="grid gap-2 sm:grid-cols-2"><OperationLink href="/inventory/central-stock" icon={Boxes} label="Batch Stock" /><OperationLink href="/inventory/transfer-queue" icon={ClipboardList} label="Request Queue" /><OperationLink href="/inventory/dispatches" icon={Truck} label="Dispatches" /></div></div></div>
  </div>;
}
function OperationLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) { return <Button asChild variant="outline" className="h-14 justify-start"><Link href={href}><Icon /> {label}</Link></Button>; }
function AssignmentError() { return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h1 className="text-lg font-semibold text-destructive">Main Warehouse is not assigned.</h1><p className="mt-1 text-sm text-muted-foreground">Contact Admin. Central Warehouse actions are unavailable.</p></div>; }
