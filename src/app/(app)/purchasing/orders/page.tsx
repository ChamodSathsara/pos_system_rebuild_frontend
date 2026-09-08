"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { BranchFilter } from "@/components/shared/branch-filter";
import { ProductSelector } from "@/components/shared/product-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePurchaseOrder, usePurchaseOrders } from "@/hooks/use-purchase";
import { useVendors } from "@/hooks/use-party";
import { useProducts } from "@/hooks/use-catalog";
import { useBranches, useWarehouses } from "@/hooks/use-organization";
import { useAuthStore, useEffectiveBranchCode } from "@/store/auth-store";
import { isBranchScoped } from "@/lib/permissions";
import { formatDate, formatMoney } from "@/lib/format";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/types";
import { toast } from "sonner";

const STATUS_OPTIONS: (PurchaseOrderStatus | "All")[] = ["All", "Open", "PartiallyReceived", "FullyReceived", "Cancelled"];

export default function PurchaseOrdersPage() {
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const branchCode = useEffectiveBranchCode(branchFilter);
  const [status, setStatus] = useState<PurchaseOrderStatus | "All">("All");
  const { data, isLoading, isError, refetch } = usePurchaseOrders({ branchCode, status: status === "All" ? undefined : status });

  const [open, setOpen] = useState(false);

  const columns = useMemo<ColumnDef<PurchaseOrder>[]>(
    () => [
      { accessorKey: "poNo", header: "PO No.", cell: ({ row }) => <Link href={`/purchasing/orders/${row.original.poNo}`} className="font-medium text-primary hover:underline">{row.original.poNo}</Link> },
      { id: "source", header: "Source", cell: ({ row }) => row.original.isInternalTransfer ? <div className="flex items-center gap-2"><span>{row.original.sourceWarehouseName || row.original.sourceWarehouseCode}</span><Badge variant="outline">Internal Transfer PO</Badge></div> : row.original.vendorName || row.original.vendorCode },
      { accessorKey: "branchCode", header: "Branch" },
      { accessorKey: "poDate", header: "PO Date", cell: ({ row }) => formatDate(row.original.poDate) },
      { accessorKey: "totalAmount", header: "Total", cell: ({ row }) => <span className="num">{formatMoney(row.original.totalAmount)}</span> },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Create and track orders placed with your vendors."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as PurchaseOrderStatus | "All")}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : s}</SelectItem>)}
              </SelectContent>
            </Select>
            <BranchFilter value={branchFilter} onChange={setBranchFilter} />
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New PO</Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        error={isError ? "Failed to load purchase orders." : null}
        onRetry={refetch}
        searchPlaceholder="Search PO number or vendor…"
        emptyTitle="No purchase orders yet"
      />

      <CreatePODialog key={branchCode ?? "all-branches"} open={open} onOpenChange={setOpen} defaultBranch={branchCode} />
    </div>
  );
}

interface LineForm {
  itemCode: string;
  quantity: string;
  unitCost: string;
}
interface CreateForm {
  supplier: string;
  branchCode: string;
  destinationWarehouseCode: string;
  poDate: string;
  expectedDate: string;
  remarks: string;
  items: LineForm[];
}

function CreatePODialog({ open, onOpenChange, defaultBranch }: { open: boolean; onOpenChange: (o: boolean) => void; defaultBranch?: string }) {
  const user = useAuthStore((state) => state.user);
  const branchScoped = isBranchScoped(user?.roleName);
  const { data: vendors } = useVendors(true);
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();
  const { data: products, isLoading: productsLoading } = useProducts({ isActive: true });
  const createM = useCreatePurchaseOrder();

  const form = useForm<CreateForm>({
    defaultValues: { supplier: "", branchCode: defaultBranch ?? "", destinationWarehouseCode: "", poDate: new Date().toISOString().slice(0, 10), expectedDate: "", remarks: "", items: [{ itemCode: "", quantity: "", unitCost: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const selectedBranch = useWatch({ control: form.control, name: "branchCode" });
  const selectedSupplier = useWatch({ control: form.control, name: "supplier" });
  const selectedDestination = useWatch({ control: form.control, name: "destinationWarehouseCode" });
  const selectedItems = useWatch({ control: form.control, name: "items" });
  const isInternal = selectedSupplier.startsWith("centralWarehouse:");
  const centralWarehouses = (warehouses ?? []).filter((warehouse) => warehouse.isActive && warehouse.isCentralWarehouse);
  const branchWarehouses = (warehouses ?? []).filter((warehouse) => warehouse.isActive && !warehouse.isCentralWarehouse && warehouse.branchCode === selectedBranch);
  const onSubmit = form.handleSubmit((v) => {
    if (!v.supplier || !v.branchCode) {
      toast.error("Supplier and branch are required.");
      return;
    }
    const internal = v.supplier.startsWith("centralWarehouse:");
    if (internal && !v.destinationWarehouseCode) { toast.error("Select the destination branch warehouse for this Internal Transfer PO."); return; }
    const items = v.items.filter((i) => i.itemCode && i.quantity && i.unitCost).map((i) => ({ itemCode: i.itemCode, quantity: Number(i.quantity), unitCost: Number(i.unitCost) }));
    if (items.length === 0) {
      toast.error("Add at least one line item.");
      return;
    }
    createM.mutate(
      { poNo: null, vendorId: internal ? null : Number(v.supplier.replace("vendor:", "")), sourceWarehouseCode: internal ? v.supplier.replace("centralWarehouse:", "") : null, destinationWarehouseCode: internal ? v.destinationWarehouseCode : null, branchCode: v.branchCode, poDate: v.poDate, expectedDate: v.expectedDate || null, remarks: v.remarks || null, items },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset({ supplier: "", branchCode: defaultBranch ?? "", destinationWarehouseCode: "", poDate: new Date().toISOString().slice(0, 10), expectedDate: "", remarks: "", items: [{ itemCode: "", quantity: "", unitCost: "" }] });
        },
      }
    );
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="New Purchase Order" onSubmit={onSubmit} isSubmitting={createM.isPending} submitLabel="Create PO" className="sm:max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Supplier *</Label>
          <Select value={selectedSupplier} onValueChange={(value) => { form.setValue("supplier", value); form.setValue("destinationWarehouseCode", ""); }}>
            <SelectTrigger><SelectValue placeholder="Select vendor or Central Warehouse" /></SelectTrigger>
            <SelectContent>
              <SelectGroup><SelectLabel>External Vendors</SelectLabel>{vendors?.map((vendor) => <SelectItem key={vendor.vendorId} value={`vendor:${vendor.vendorId}`}>{vendor.vendorName}</SelectItem>)}</SelectGroup>
              <SelectSeparator />
              <SelectGroup><SelectLabel>Central Warehouses</SelectLabel>{centralWarehouses.map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={`centralWarehouse:${warehouse.warehouseCode}`}>{warehouse.warehouseName} ({warehouse.warehouseCode})</SelectItem>)}</SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Branch *</Label>
          <Select value={selectedBranch} onValueChange={(value) => { form.setValue("branchCode", value, { shouldDirty: true }); form.setValue("destinationWarehouseCode", ""); }} disabled={branchScoped || branchesLoading}>
            <SelectTrigger><SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select branch"} /></SelectTrigger>
            <SelectContent>{branches?.map((branch) => <SelectItem key={branch.branchCode} value={branch.branchCode}>{branch.branchName} ({branch.branchCode})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {isInternal && <div className="space-y-1.5"><Label>Destination Branch Warehouse *</Label><Select value={selectedDestination} onValueChange={(value) => form.setValue("destinationWarehouseCode", value)} disabled={!selectedBranch || warehousesLoading}><SelectTrigger><SelectValue placeholder={!selectedBranch ? "Select branch first" : "Select destination warehouse"} /></SelectTrigger><SelectContent>{branchWarehouses.map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={warehouse.warehouseCode}>{warehouse.warehouseName} ({warehouse.warehouseCode})</SelectItem>)}</SelectContent></Select></div>}
        <div className="space-y-1.5"><Label>PO Date *</Label><Input type="date" {...form.register("poDate", { required: true })} /></div>
        <div className="space-y-1.5"><Label>Expected Date</Label><Input type="date" {...form.register("expectedDate")} /></div>
        <div className="space-y-1.5"><Label>Remarks</Label><Input {...form.register("remarks")} /></div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Line Items *</Label>
          <Button type="button" size="xs" variant="outline" onClick={() => append({ itemCode: "", quantity: "", unitCost: "" })}>
            <Plus className="h-3.5 w-3.5" /> Add Line
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ProductSelector products={products ?? []} value={selectedItems?.[idx]?.itemCode ?? ""} onChange={(value) => form.setValue(`items.${idx}.itemCode`, value, { shouldDirty: true })} isLoading={productsLoading} />
              </div>
              <Input placeholder="Qty" type="number" step="0.01" className="w-24" {...form.register(`items.${idx}.quantity` as const)} />
              <Input placeholder="Unit cost" type="number" step="0.01" className="w-28" {...form.register(`items.${idx}.unitCost` as const)} />
              <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => remove(idx)} disabled={fields.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </FormDialog>
  );
}
