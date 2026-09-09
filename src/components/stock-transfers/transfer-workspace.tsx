"use client";
import { useMemo, useState } from "react";
import { Plus, Truck, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuthStore } from "@/store/auth-store";
import { useWarehouse, useWarehouses } from "@/hooks/use-organization";
import { useProducts } from "@/hooks/use-catalog";
import { useAcceptStockTransfer, useBranchAcceptTransfer, useCreateStockTransfer, useDispatchStockTransfer, useReceiveStockTransfer, useStockTransfers } from "@/hooks/use-stock-transfer";
import { stockBatchesApi, stockInventoriesApi, stockTransfersApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ColumnDef } from "@tanstack/react-table";
import type { StockBatch, StockTransfer, StockTransferLine, TransferDispatch } from "@/types";

type Mode = "requests" | "queue" | "dispatches" | "incoming";
type RequestLineDraft = { itemCode: string; quantity: string; remarks: string };
type DispatchDraft = { transferRequestLineId: number; itemCode: string; batchId: string; quantity: string };
type ReceiveDraft = { dispatchLineId: number; dispatchedQty: number; receivedQty: string; damagedQty: string; shortQty: string; remarks: string };
const statusClass: Record<string, string> = { Submitted: "bg-warning/15 text-warning", AwaitingBranch: "bg-warning/15 text-warning", Accepted: "bg-primary/10 text-primary", Picking: "bg-primary/10 text-primary", Dispatched: "bg-blue-500/10 text-blue-700", Received: "bg-success/15 text-success", Rejected: "bg-destructive/10 text-destructive", Cancelled: "bg-muted text-muted-foreground" };
const statusLabel: Record<string, string> = { AwaitingBranch: "Waiting for Branch Acceptance", Accepted: "Central Dispatch Queue", Dispatched: "In Transit", Received: "Completed" };

export function TransferWorkspace({ mode }: { mode: Mode }) {
  const user = useAuthStore((s) => s.user);
  const isInventoryClerk = user?.roleName === "InventoryClerk";
  const { data: allWarehouses } = useWarehouses(undefined, !isInventoryClerk);
  const { data: assignedWarehouse, isLoading: assignedWarehouseLoading, isError: assignedWarehouseError } = useWarehouse(isInventoryClerk ? user?.warehouseCode : undefined);
  const warehouses = isInventoryClerk ? (assignedWarehouse ? [assignedWarehouse] : []) : (allWarehouses ?? []);
  const { data: products } = useProducts({ isActive: true });
  const central = warehouses.filter((w) => w.isCentralWarehouse);
  const ownWarehouses = warehouses.filter((w) => !w.isCentralWarehouse && (user?.roleName !== "Branch_Manager" || w.branchCode === user.branchCode));
  const [warehouseCode, setWarehouseCode] = useState("");
  const [status, setStatus] = useState(""); const [fromDate, setFromDate] = useState(""); const [toDate, setToDate] = useState("");
  const effectiveWarehouse = isInventoryClerk ? user?.warehouseCode ?? "" : warehouseCode || (mode === "queue" || mode === "dispatches" ? central[0]?.warehouseCode : ownWarehouses[0]?.warehouseCode) || "";
  const filters = { ...(mode === "queue" || mode === "dispatches" ? { sourceWarehouseCode: effectiveWarehouse } : { destinationWarehouseCode: effectiveWarehouse }), status: (status || undefined) as import("@/types").StockTransferStatus | undefined, fromDate: fromDate || undefined, toDate: toDate || undefined };
  const query = useStockTransfers(effectiveWarehouse ? filters : undefined, !!effectiveWarehouse);
  const rows = useMemo(() => (query.data ?? []).filter((t) => (mode !== "queue" || ["Submitted", "Accepted", "Picking"].includes(t.status)) && (mode !== "incoming" || ["AwaitingBranch", "Accepted", "Dispatched", "Received"].includes(t.status)) && (mode !== "dispatches" || ["Dispatched", "Received"].includes(t.status))), [query.data, mode]);
  const counts = useMemo(() => ({ pending: rows.filter((x) => x.status === "Submitted").length, accepted: rows.filter((x) => x.status === "Accepted").length, ready: rows.filter((x) => x.status === "Picking").length, transit: rows.filter((x) => x.status === "Dispatched").length, received: rows.filter((x) => x.status === "Received" && new Date(x.requestDate).toDateString() === new Date().toDateString()).length, dispatchQty: rows.flatMap((x) => x.dispatches ?? []).filter((d) => new Date(d.dispatchedAt).toDateString() === new Date().toDateString()).flatMap((d) => d.lines).reduce((sum, x) => sum + x.quantity, 0) }), [rows]);
  const [createOpen, setCreateOpen] = useState(false);
  const [acceptFor, setAcceptFor] = useState<StockTransfer | null>(null);
  const [branchAcceptFor, setBranchAcceptFor] = useState<StockTransfer | null>(null);
  const [dispatchFor, setDispatchFor] = useState<StockTransfer | null>(null);
  const [receiveFor, setReceiveFor] = useState<{ transfer: StockTransfer; dispatch: TransferDispatch } | null>(null);
  const [detailFor, setDetailFor] = useState<StockTransfer | null>(null);
  const title = { requests: "Stock Requests", queue: "Main Warehouse Request Queue", dispatches: "Dispatch History", incoming: "Incoming Deliveries" }[mode];
  const columns: ColumnDef<StockTransfer>[] = [
    { accessorKey: "requestNo", header: "Request", cell: ({ row }) => <Button type="button" variant="link" className="h-auto p-0 font-medium" onClick={() => setDetailFor(row.original)}>{row.original.requestNo}</Button> },
    { accessorKey: "requestDate", header: "Requested", cell: ({ row }) => formatDateTime(row.original.requestDate) },
    { id: "sourceWarehouse", header: "From", cell: ({ row }) => row.original.sourceWarehouseName ? `${row.original.sourceWarehouseName} (${row.original.sourceWarehouseCode})` : row.original.sourceWarehouseCode },
    { id: "destinationWarehouse", header: "To", cell: ({ row }) => row.original.destinationWarehouseName ? `${row.original.destinationWarehouseName} (${row.original.destinationWarehouseCode})` : row.original.destinationWarehouseCode },
    { id: "items", header: "Items", cell: ({ row }) => row.original.lines.length },
    { id: "totalQty", header: "Total Qty", cell: ({ row }) => <span className="num font-medium">{row.original.lines.reduce((sum, line) => sum + line.requestedQty, 0)}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant="outline" className={statusClass[row.original.status]}>{statusLabel[row.original.status] || row.original.status}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => <TransferActions transfer={row.original} mode={mode} onBranchAccept={setBranchAcceptFor} onAccept={setAcceptFor} onDispatch={setDispatchFor} onReceive={(transfer, dispatch) => setReceiveFor({ transfer, dispatch })} /> },
  ];
  const selectorWarehouses = mode === "queue" || mode === "dispatches" ? central : ownWarehouses;
  if (isInventoryClerk && !user?.warehouseCode) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h1 className="text-lg font-semibold text-destructive">Main Warehouse is not assigned.</h1><p className="mt-1 text-sm text-muted-foreground">Contact Admin. Warehouse actions are unavailable until a Main Warehouse is assigned, then sign out and sign in again.</p></div>;
  if (isInventoryClerk && assignedWarehouseLoading) return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading assigned Main Warehouse...</div>;
  if (isInventoryClerk && (assignedWarehouseError || !assignedWarehouse?.isCentralWarehouse)) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h1 className="text-lg font-semibold text-destructive">Assigned Main Warehouse could not be loaded.</h1><p className="mt-1 text-sm text-muted-foreground">Contact Admin and verify the warehouse assignment.</p></div>;
  return <div className="space-y-6">
    <PageHeader title={title} description="Internal Main Warehouse to branch warehouse stock movements." actions={<div className="flex gap-2">
      <Select value={effectiveWarehouse} onValueChange={setWarehouseCode} disabled={isInventoryClerk}><SelectTrigger className="w-56"><SelectValue placeholder="Select warehouse" /></SelectTrigger><SelectContent>{selectorWarehouses.map((w) => <SelectItem key={w.warehouseCode} value={w.warehouseCode}>{w.warehouseName} ({w.warehouseCode})</SelectItem>)}</SelectContent></Select>
      {mode === "requests" && <Button onClick={() => setCreateOpen(true)}><Plus /> New Request</Button>}
    </div>} />
    {isInventoryClerk && assignedWarehouse && <div className="rounded-xl border bg-card p-4"><p className="font-medium">{assignedWarehouse.warehouseName}</p><p className="mt-1 text-sm text-muted-foreground">{assignedWarehouse.warehouseCode} · {assignedWarehouse.address || "No address recorded"}</p></div>}
    <div className={`grid gap-3 ${mode === "queue" ? "sm:grid-cols-5" : "sm:grid-cols-3"}`}>{(mode === "queue" ? [["Pending Requests", counts.pending], ["Accepted", counts.accepted], ["Ready to Dispatch", counts.ready], ["In Transit", counts.transit], ["Today's Dispatch Qty", counts.dispatchQty]] : [["Pending Requests", counts.pending], ["In Transit Deliveries", counts.transit], ["Received Today", counts.received]]).map(([label, value]) => <div key={String(label)} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div>
    <div className="flex flex-wrap gap-2"><Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["Submitted", "AwaitingBranch", "Accepted", "Picking", "Dispatched", "Received", "Rejected", "Cancelled"].map((x) => <SelectItem key={x} value={x}>{statusLabel[x] || x}</SelectItem>)}</SelectContent></Select><Input className="w-40" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" /><Input className="w-40" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To date" /></div>
    <DataTable columns={columns} data={rows} isLoading={query.isLoading} error={query.isError ? "Stock transfers could not be loaded." : null} onRetry={query.refetch} searchPlaceholder="Search request, warehouse or status…" emptyTitle="No stock transfers found" pageSize={12} />
    {createOpen && <CreateRequestDialog destinationCode={effectiveWarehouse} warehouses={warehouses ?? []} products={products ?? []} lockSource={user?.roleName === "Branch_Manager"} onClose={() => setCreateOpen(false)} />}
    {acceptFor && <AcceptDialog transfer={acceptFor} onClose={() => setAcceptFor(null)} />}
    {branchAcceptFor && <BranchAcceptDialog transfer={branchAcceptFor} onClose={() => setBranchAcceptFor(null)} />}
    {dispatchFor && <DispatchDialog transfer={dispatchFor} onClose={() => setDispatchFor(null)} />}
    {receiveFor && <ReceiveDialog transfer={receiveFor.transfer} dispatch={receiveFor.dispatch} onClose={() => setReceiveFor(null)} />}
    <TransferDetailSheet transfer={detailFor} onClose={() => setDetailFor(null)} />
  </div>;
}

function TransferDetailSheet({ transfer, onClose }: { transfer: StockTransfer | null; onClose: () => void }) {
  const total = transfer?.lines.reduce((sum, line) => sum + line.requestedQty, 0) ?? 0;
  return <Sheet open={!!transfer} onOpenChange={(open) => !open && onClose()}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl"><SheetHeader><SheetTitle>{transfer?.requestNo || "Transfer Request"}</SheetTitle></SheetHeader>{transfer && <div className="mt-5 space-y-5">
    <div className="grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm"><Detail label="Status" value={statusLabel[transfer.status] || transfer.status} /><Detail label="Requested" value={formatDateTime(transfer.requestDate)} /><Detail label="Source" value={transfer.sourceWarehouseName ? `${transfer.sourceWarehouseName} (${transfer.sourceWarehouseCode})` : transfer.sourceWarehouseCode} /><Detail label="Destination" value={transfer.destinationWarehouseName ? `${transfer.destinationWarehouseName} (${transfer.destinationWarehouseCode})` : transfer.destinationWarehouseCode} /><Detail label="Required Date" value={transfer.requiredDate ? formatDateTime(transfer.requiredDate) : "—"} /><Detail label="Total Quantity" value={String(total)} /></div>
    <div><h3 className="mb-2 text-sm font-semibold">Requested Items</h3><div className="space-y-2">{transfer.lines.map((line) => <div key={line.transferRequestLineId} className="rounded-lg border p-3"><div className="flex items-center justify-between"><p className="font-medium">{line.itemName || line.itemCode}</p><p className="text-sm text-muted-foreground">{line.itemCode}</p></div><div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><Detail label="Requested" value={String(line.requestedQty)} /><Detail label="Approved" value={String(line.approvedQty)} /><Detail label="Dispatched" value={String(line.dispatchedQty)} /><Detail label="Received" value={String(line.receivedQty)} /></div>{line.remarks && <p className="mt-2 text-xs text-muted-foreground">{line.remarks}</p>}</div>)}</div></div>
    {transfer.remarks && <div><h3 className="mb-1 text-sm font-semibold">Request Remarks</h3><p className="rounded-lg border p-3 text-sm text-muted-foreground">{transfer.remarks}</p></div>}
    {!!transfer.dispatches?.length && <div><h3 className="mb-2 text-sm font-semibold">Dispatch Information</h3><div className="space-y-2">{transfer.dispatches.map((dispatch) => <div key={dispatch.dispatchId} className="rounded-lg border p-3 text-sm"><div className="flex justify-between"><p className="font-medium">{dispatch.dispatchNo}</p><Button size="xs" variant="outline" onClick={() => void stockTransfersApi.deliveryNote(dispatch.dispatchId, dispatch.dispatchNo)}><Download /> Delivery Note</Button></div><p className="mt-1 text-muted-foreground">{formatDateTime(dispatch.dispatchedAt)} · {dispatch.vehicleNo || "No vehicle"} · {dispatch.driverName || "No driver"}</p></div>)}</div></div>}
  </div>}</SheetContent></Sheet>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 font-medium">{value}</p></div>; }

function TransferActions({ transfer, mode, onBranchAccept, onAccept, onDispatch, onReceive }: { transfer: StockTransfer; mode: Mode; onBranchAccept: (x: StockTransfer) => void; onAccept: (x: StockTransfer) => void; onDispatch: (x: StockTransfer) => void; onReceive: (x: StockTransfer, d: TransferDispatch) => void }) {
  const dispatch = transfer.dispatches?.at(-1);
  return <div className="flex justify-end gap-1">
    {mode === "incoming" && transfer.status === "AwaitingBranch" && <Button size="xs" onClick={() => onBranchAccept(transfer)}>Accept Transfer</Button>}
    {mode === "queue" && transfer.status === "Submitted" && <Button size="xs" onClick={() => onAccept(transfer)}>Accept</Button>}
    {mode === "queue" && ["Accepted", "Picking"].includes(transfer.status) && <Button size="xs" onClick={() => onDispatch(transfer)}><Truck /> Dispatch</Button>}
    {mode === "incoming" && transfer.status === "Dispatched" && dispatch && <Button size="xs" onClick={() => onReceive(transfer, dispatch)}><CheckCircle2 /> Receive / GRN</Button>}
    {dispatch && <Button size="xs" variant="outline" onClick={() => void stockTransfersApi.deliveryNote(dispatch.dispatchId, dispatch.dispatchNo)}><Download /> Delivery Note</Button>}
  </div>;
}

function CreateRequestDialog({ destinationCode, warehouses, products, lockSource, onClose }: { destinationCode: string; warehouses: import("@/types").Warehouse[]; products: import("@/types").Product[]; lockSource: boolean; onClose: () => void }) {
  const destination = warehouses.find((w) => w.warehouseCode === destinationCode);
  const [source, setSource] = useState(destination?.parentWarehouseCode || warehouses.find((w) => w.isCentralWarehouse)?.warehouseCode || "");
  const [requiredDate, setRequiredDate] = useState(""); const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<RequestLineDraft[]>([{ itemCode: "", quantity: "", remarks: "" }]); const mutation = useCreateStockTransfer();
  const submit = () => { if (!source || !destinationCode || !requiredDate || lines.some((x) => !x.itemCode || !Number.isInteger(Number(x.quantity)) || Number(x.quantity) <= 0)) { toast.error("Source, destination, required date, item and a positive whole-number quantity are required."); return; } mutation.mutate({ sourceWarehouseCode: source, destinationWarehouseCode: destinationCode, requiredDate: new Date(`${requiredDate}T00:00:00Z`).toISOString(), remarks: remarks || null, lines: lines.map((x) => ({ itemCode: x.itemCode, quantity: Number(x.quantity), remarks: x.remarks || null })) }, { onSuccess: onClose }); };
  return <FormDialog open onOpenChange={(o) => !o && onClose()} title="New Stock Request" description="Request stock from the assigned Main Warehouse." onSubmit={submit} isSubmitting={mutation.isPending} submitLabel="Submit Request" className="sm:max-w-3xl"><div className="grid grid-cols-2 gap-3"><Field label="Source"><Select value={source} onValueChange={setSource} disabled={lockSource || !!destination?.parentWarehouseCode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{warehouses.filter((w) => w.isCentralWarehouse).map((w) => <SelectItem key={w.warehouseCode} value={w.warehouseCode}>{w.warehouseName}</SelectItem>)}</SelectContent></Select></Field><Field label="Destination"><Input value={destinationCode} disabled /></Field><Field label="Required Date"><Input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} /></Field><Field label="Remarks"><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field></div>{lines.map((line, i) => <div key={i} className="grid grid-cols-[1fr_120px_1fr_auto] gap-2"><Select value={line.itemCode} onValueChange={(v) => setLines((a) => a.map((x, n) => n === i ? { ...x, itemCode: v } : x))}><SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.itemCode} value={p.itemCode}>{p.itemName} ({p.itemCode})</SelectItem>)}</SelectContent></Select><Input type="number" min="1" step="1" placeholder="Qty" value={line.quantity} onChange={(e) => setLines((a) => a.map((x, n) => n === i ? { ...x, quantity: e.target.value } : x))} /><Input placeholder="Line remarks" value={line.remarks} onChange={(e) => setLines((a) => a.map((x, n) => n === i ? { ...x, remarks: e.target.value } : x))} /><Button type="button" variant="ghost" disabled={lines.length === 1} onClick={() => setLines((a) => a.filter((_, n) => n !== i))}>Remove</Button></div>)}<Button type="button" variant="outline" onClick={() => setLines((a) => [...a, { itemCode: "", quantity: "", remarks: "" }])}><Plus /> Add Item</Button></FormDialog>;
}

function BranchAcceptDialog({ transfer, onClose }: { transfer: StockTransfer; onClose: () => void }) {
  const mutation = useBranchAcceptTransfer(); const [remarks, setRemarks] = useState(""); const [confirm, setConfirm] = useState(false);
  const accept = () => mutation.mutate({ id: transfer.transferRequestId, body: { remarks: remarks.trim() || null } }, { onSuccess: () => { setConfirm(false); onClose(); } });
  return <><FormDialog open onOpenChange={(open) => !open && onClose()} title={`Accept transfer ${transfer.requestNo}?`} description={`From ${transfer.sourceWarehouseName || transfer.sourceWarehouseCode}. Central stock will remain unchanged until dispatch.`} onSubmit={() => setConfirm(true)} isSubmitting={mutation.isPending} submitLabel="Review Acceptance"><div className="rounded-lg border p-3"><p className="text-sm font-medium">Requested items</p>{transfer.lines.map((line) => <div key={line.transferRequestLineId} className="mt-2 flex justify-between text-sm"><span>{line.itemName || line.itemCode}</span><span className="font-medium">{line.requestedQty}</span></div>)}</div><Field label="Branch Remarks"><Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Accepted by branch..." /></Field></FormDialog><ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Confirm branch acceptance?" description="The proposal will move to the Central Warehouse dispatch queue. No stock changes happen yet." confirmLabel="Accept Transfer" loading={mutation.isPending} onConfirm={accept} /></>;
}

function AcceptDialog({ transfer, onClose }: { transfer: StockTransfer; onClose: () => void }) {
  const mutation = useAcceptStockTransfer();
  const [remarks, setRemarks] = useState("");
  const [qty, setQty] = useState<Record<number, string>>(() => Object.fromEntries(transfer.lines.map((x) => [x.transferRequestLineId, String(x.requestedQty)])));
  const submit = () => {
    if (transfer.lines.some((x) => !Number.isInteger(Number(qty[x.transferRequestLineId])) || Number(qty[x.transferRequestLineId]) < 0 || Number(qty[x.transferRequestLineId]) > x.requestedQty)) {
      toast.error("Approved quantities must be whole numbers between zero and the requested quantity.");
      return;
    }
    mutation.mutate({ id: transfer.transferRequestId, body: { remarks: remarks || null, lines: transfer.lines.map((x) => ({ transferRequestLineId: x.transferRequestLineId, approvedQty: Number(qty[x.transferRequestLineId]) })) } }, { onSuccess: onClose });
  };
  return <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Accept ${transfer.requestNo}`} onSubmit={submit} isSubmitting={mutation.isPending} submitLabel="Accept Request"><TransferQtyFields lines={transfer.lines} values={qty} setValues={setQty} label="Approved" /><Field label="Remarks"><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field></FormDialog>;
}

function DispatchDialog({ transfer, onClose }: { transfer: StockTransfer; onClose: () => void }) {
  const mutation = useDispatchStockTransfer(); const [vehicleNo, setVehicleNo] = useState(""); const [driverName, setDriverName] = useState(""); const [remarks, setRemarks] = useState(""); const [batches, setBatches] = useState<Record<number, StockBatch[]>>({}); const [confirm, setConfirm] = useState(false);
  const [lines, setLines] = useState<DispatchDraft[]>(() => transfer.lines.filter((x) => x.approvedQty > 0).map((x) => ({ transferRequestLineId: x.transferRequestLineId, itemCode: x.itemCode, batchId: "", quantity: String(x.approvedQty) })));
  const load = async (line: DispatchDraft) => { if (batches[line.transferRequestLineId]) return; const stocks = await stockInventoriesApi.list({ itemCode: line.itemCode, warehouseCode: transfer.sourceWarehouseCode }); const found = (await Promise.all(stocks.map((s) => stockBatchesApi.listByStock(s.stockId)))).flat().filter((b) => b.status === "Available" && b.availableQty > 0); setBatches((x) => ({ ...x, [line.transferRequestLineId]: found })); };
  const dispatch = () => mutation.mutate({ id: transfer.transferRequestId, body: { vehicleNo, driverName, remarks: remarks || null, lines: lines.map((x) => ({ transferRequestLineId: x.transferRequestLineId, batchId: Number(x.batchId), quantity: Number(x.quantity) })) } }, { onSuccess: (result) => { void stockTransfersApi.deliveryNote(result.dispatchId, result.dispatchNo); setConfirm(false); onClose(); } });
  const reviewDispatch = () => {
    if (!vehicleNo.trim() || !driverName.trim() || lines.some((x) => !x.batchId || !Number.isInteger(Number(x.quantity)) || Number(x.quantity) <= 0)) { toast.error("Vehicle, driver, batch and positive whole-number quantities are required."); return; }
    const exceedsApproval = transfer.lines.some((requestLine) => lines.filter((x) => x.transferRequestLineId === requestLine.transferRequestLineId).reduce((sum, x) => sum + Number(x.quantity), 0) > requestLine.approvedQty);
    if (exceedsApproval) { toast.error("A dispatched item quantity cannot exceed its approved quantity."); return; }
    const exceedsStock = lines.some((line) => {
      const available = Object.values(batches).flat().find((batch) => String(batch.batchId) === line.batchId)?.availableQty;
      const allocated = lines.filter((x) => x.batchId === line.batchId).reduce((sum, x) => sum + Number(x.quantity), 0);
      return available === undefined || allocated > available;
    });
    if (exceedsStock) { toast.error("One or more batch allocations exceed the available Main Warehouse stock."); return; }
    setConfirm(true);
  };
  return <><FormDialog open onOpenChange={(o) => !o && onClose()} title={`Dispatch ${transfer.requestNo}`} description="Allocate available Main Warehouse batches." onSubmit={reviewDispatch} isSubmitting={mutation.isPending} submitLabel="Review Dispatch" className="sm:max-w-3xl"><div className="grid grid-cols-2 gap-3"><Field label="Vehicle No."><Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} /></Field><Field label="Driver Name"><Input value={driverName} onChange={(e) => setDriverName(e.target.value)} /></Field></div>{lines.map((line, i) => <div key={i} className="grid grid-cols-[1fr_1fr_120px_auto] gap-2"><Input value={line.itemCode} disabled /><Select value={line.batchId} onOpenChange={(o) => o && void load(line)} onValueChange={(v) => setLines((a) => a.map((x, n) => n === i ? { ...x, batchId: v } : x))}><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger><SelectContent>{(batches[line.transferRequestLineId] ?? []).map((b) => <SelectItem key={b.batchId} value={String(b.batchId)}>{b.batchNo} · {b.availableQty} available</SelectItem>)}</SelectContent></Select><Input type="number" min="1" step="1" value={line.quantity} onChange={(e) => setLines((a) => a.map((x, n) => n === i ? { ...x, quantity: e.target.value } : x))} /><Button type="button" variant="outline" onClick={() => setLines((a) => [...a, { ...line, batchId: "", quantity: "" }])}>Split</Button></div>)}<Field label="Remarks"><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field></FormDialog><ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Dispatch this stock?" description="Main Warehouse stock will decrease immediately. This action must match the physical vehicle load." confirmLabel="Confirm Dispatch" loading={mutation.isPending} onConfirm={dispatch} /></>;
}

function ReceiveDialog({ transfer, dispatch, onClose }: { transfer: StockTransfer; dispatch: TransferDispatch; onClose: () => void }) { const mutation = useReceiveStockTransfer(); const [remarks, setRemarks] = useState(""); const [confirm, setConfirm] = useState(false); const [lines, setLines] = useState<ReceiveDraft[]>(() => dispatch.lines.map((x) => ({ dispatchLineId: x.dispatchLineId, dispatchedQty: x.quantity, receivedQty: String(x.quantity), damagedQty: "0", shortQty: "0", remarks: "" }))); const valid = lines.every((x) => Number(x.receivedQty) + Number(x.damagedQty) + Number(x.shortQty) === x.dispatchedQty); const receive = () => mutation.mutate({ id: dispatch.dispatchId, body: { remarks: remarks || null, lines: lines.map((x) => ({ dispatchLineId: x.dispatchLineId, receivedQty: Number(x.receivedQty), damagedQty: Number(x.damagedQty), shortQty: Number(x.shortQty), remarks: x.remarks || null })) } }, { onSuccess: (result) => { void stockTransfersApi.receipt(result.receiptId, result.receiptNo); setConfirm(false); onClose(); } }); return <><FormDialog open onOpenChange={(o) => !o && onClose()} title={`Receive ${dispatch.dispatchNo}`} description={`Into ${transfer.destinationWarehouseCode} · ${dispatch.vehicleNo || "Vehicle not recorded"} · ${dispatch.driverName || "Driver not recorded"}`} onSubmit={() => valid ? setConfirm(true) : toast.error("For every batch, received + damaged + short must equal dispatched quantity.")} isSubmitting={mutation.isPending} submitLabel="Review Receipt" className="sm:max-w-4xl">{lines.map((line, i) => <div key={line.dispatchLineId} className="grid grid-cols-5 gap-2"><Field label="Dispatched"><Input value={line.dispatchedQty} disabled /></Field>{(["receivedQty", "damagedQty", "shortQty"] as const).map((key) => <Field key={key} label={key.replace("Qty", " Qty")}><Input type="number" min="0" value={line[key]} onChange={(e) => setLines((a) => a.map((x, n) => n === i ? { ...x, [key]: e.target.value } : x))} /></Field>)}<Field label="Remarks"><Input value={line.remarks} onChange={(e) => setLines((a) => a.map((x, n) => n === i ? { ...x, remarks: e.target.value } : x))} /></Field></div>)}{!valid && <p className="text-sm text-destructive">Every line total must exactly match the dispatched quantity.</p>}<Field label="Receipt Remarks"><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field></FormDialog><ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Receive this delivery?" description="Branch stock will increase by the received quantities." confirmLabel="Confirm Receipt" loading={mutation.isPending} onConfirm={receive} /></>;
}
function TransferQtyFields({ lines, values, setValues, label }: { lines: StockTransferLine[]; values: Record<number, string>; setValues: React.Dispatch<React.SetStateAction<Record<number, string>>>; label: string }) { return <div className="space-y-2">{lines.map((x) => <div key={x.transferRequestLineId} className="grid grid-cols-[1fr_140px] gap-2"><Input value={`${x.itemName || x.itemCode} · requested ${x.requestedQty}`} disabled /><Field label={label}><Input type="number" min="0" max={x.requestedQty} value={values[x.transferRequestLineId]} onChange={(e) => setValues((v) => ({ ...v, [x.transferRequestLineId]: e.target.value }))} /></Field></div>)}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
