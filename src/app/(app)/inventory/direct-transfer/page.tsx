"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ProductSelector } from "@/components/shared/product-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/hooks/use-catalog";
import { useWarehouses } from "@/hooks/use-organization";
import { useDirectDispatch } from "@/hooks/use-stock-transfer";
import { useAuthStore } from "@/store/auth-store";

type Line = { itemCode: string; quantity: string; remarks: string };
const blank = (): Line => ({ itemCode: "", quantity: "", remarks: "" });
export default function DirectTransferPage() {
  const sourceCode = useAuthStore((state) => state.user?.warehouseCode) ?? ""; const warehouses = useWarehouses(); const products = useProducts({ isActive: true }); const mutation = useDirectDispatch(); const [destination, setDestination] = useState(""); const [remarks, setRemarks] = useState(""); const [lines, setLines] = useState<Line[]>([blank()]); const [submittedNo, setSubmittedNo] = useState("");
  if (!sourceCode) return <AssignmentError />;
  const destinations = (warehouses.data ?? []).filter((warehouse) => warehouse.isActive && !warehouse.isCentralWarehouse && (!warehouse.parentWarehouseCode || warehouse.parentWarehouseCode === sourceCode));
  const submit = () => { if (!destination) { toast.error("Select the destination branch warehouse."); return; } if (lines.some((line) => !line.itemCode || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0)) { toast.error("Select an item and enter a positive quantity for every proposal line."); return; } mutation.mutate({ destinationWarehouseCode: destination, remarks: remarks.trim() || null, lines: lines.map((line) => ({ itemCode: line.itemCode, quantity: Number(line.quantity), remarks: line.remarks.trim() || null })) }, { onSuccess: (response) => { setSubmittedNo(response.data.requestNo); setDestination(""); setRemarks(""); setLines([blank()]); } }); };
  return <div className="space-y-6"><PageHeader title="Propose Transfer" description={`Propose stock from ${sourceCode}. Central stock will not decrease until the branch accepts and Central dispatches it.`} />
    {submittedNo && <div className="rounded-xl border border-warning/30 bg-warning/5 p-4"><p className="font-semibold text-warning">Waiting for Branch Acceptance</p><p className="mt-1 text-sm text-muted-foreground">Proposal {submittedNo} was sent successfully. Batch selection and delivery-note printing become available only after acceptance.</p></div>}
    <div className="space-y-5 rounded-xl border bg-card p-6"><Field label="Destination Branch Warehouse *"><Select value={destination} onValueChange={setDestination}><SelectTrigger><SelectValue placeholder={warehouses.isLoading ? "Loading..." : "Select destination"} /></SelectTrigger><SelectContent>{destinations.map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={warehouse.warehouseCode}>{warehouse.warehouseName} ({warehouse.warehouseCode})</SelectItem>)}</SelectContent></Select></Field>
    <div className="space-y-3">{lines.map((line, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[1.5fr_140px_1fr_auto]"><ProductSelector products={products.data ?? []} value={line.itemCode} onChange={(value) => setLines((all) => all.map((item, i) => i === index ? { ...item, itemCode: value } : item))} isLoading={products.isLoading} /><Input type="number" min="0.01" step="0.01" placeholder="Quantity" value={line.quantity} onChange={(e) => setLines((all) => all.map((item, i) => i === index ? { ...item, quantity: e.target.value } : item))} /><Input placeholder="Line remarks" value={line.remarks} onChange={(e) => setLines((all) => all.map((item, i) => i === index ? { ...item, remarks: e.target.value } : item))} /><Button variant="ghost" size="icon" disabled={lines.length === 1} onClick={() => setLines((all) => all.filter((_, i) => i !== index))}><Trash2 /></Button></div>)}</div><Button variant="outline" onClick={() => setLines((all) => [...all, blank()])}><Plus /> Add Item</Button><Field label="Proposal Remarks"><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field><div className="flex justify-end"><Button onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? "Sending proposal..." : "Send for Branch Acceptance"}</Button></div></div>
  </div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function AssignmentError() { return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h1 className="font-semibold text-destructive">Main Warehouse is not assigned.</h1><p className="text-sm text-muted-foreground">Contact Admin.</p></div>; }
