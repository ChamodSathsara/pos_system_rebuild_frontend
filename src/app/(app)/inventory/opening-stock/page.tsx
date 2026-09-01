"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/hooks/use-catalog";
import { useBranches, useWarehouses } from "@/hooks/use-organization";
import { useCreateOpeningStock } from "@/hooks/use-stock";
import { isBranchScoped } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

interface FormValues {
  itemCode: string;
  branchCode: string;
  warehouseCode: string;
  batchNo: string;
  quantity: string;
  unitCost: string;
  expiryDate: string;
  openingDate: string;
  referenceNo: string;
  remarks: string;
}

const today = () => new Date().toISOString().slice(0, 10);

function defaults(branchCode = ""): FormValues {
  return {
    itemCode: "",
    branchCode,
    warehouseCode: "",
    batchNo: "",
    quantity: "",
    unitCost: "",
    expiryDate: "",
    openingDate: today(),
    referenceNo: "",
    remarks: "",
  };
}

export default function OpeningStockPage() {
  const user = useAuthStore((state) => state.user);
  const scoped = isBranchScoped(user?.roleName);
  const assignedBranch = scoped ? user?.branchCode ?? "" : "";
  const form = useForm<FormValues>({ defaultValues: defaults(assignedBranch) });
  const selectedBranch = useWatch({ control: form.control, name: "branchCode" });
  const selectedItem = useWatch({ control: form.control, name: "itemCode" });
  const selectedWarehouse = useWatch({ control: form.control, name: "warehouseCode" });
  const { data: products, isLoading: productsLoading } = useProducts({ isActive: true });
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses(selectedBranch || undefined);
  const createOpeningStock = useCreateOpeningStock();

  const activeWarehouses = useMemo(
    () => (warehouses ?? []).filter((warehouse) => warehouse.isActive && warehouse.branchCode === selectedBranch),
    [warehouses, selectedBranch]
  );

  useEffect(() => {
    if (assignedBranch && form.getValues("branchCode") !== assignedBranch) {
      form.setValue("branchCode", assignedBranch);
    }
  }, [assignedBranch, form]);

  const selectBranch = (branchCode: string) => {
    form.setValue("branchCode", branchCode, { shouldValidate: true });
    form.setValue("warehouseCode", "");
  };

  const onSubmit = form.handleSubmit((values) => {
    createOpeningStock.mutate(
      {
        itemCode: values.itemCode,
        branchCode: values.branchCode,
        warehouseCode: values.warehouseCode,
        batchNo: values.batchNo.trim(),
        quantity: Number(values.quantity),
        unitCost: Number(values.unitCost),
        expiryDate: values.expiryDate || null,
        openingDate: `${values.openingDate}T00:00:00.000Z`,
        referenceNo: values.referenceNo.trim() || null,
        remarks: values.remarks.trim() || null,
      },
      { onSuccess: () => form.reset(defaults(assignedBranch)) }
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opening Stock"
        description="Set the initial batch quantity and value for a product. The stock line is created automatically."
      />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>New Opening Stock</CardTitle>
          <CardDescription>Fields marked with * are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <input type="hidden" {...form.register("itemCode", { required: "Product is required." })} />
            <input type="hidden" {...form.register("branchCode", { required: "Branch is required." })} />
            <input type="hidden" {...form.register("warehouseCode", { required: "Warehouse is required." })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="itemCode">Product / Item *</Label>
                <Select value={selectedItem} onValueChange={(value) => form.setValue("itemCode", value, { shouldValidate: true })} disabled={productsLoading}>
                  <SelectTrigger id="itemCode"><SelectValue placeholder={productsLoading ? "Loading products..." : "Select a product"} /></SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => <SelectItem key={product.itemCode} value={product.itemCode}>{product.itemName} ({product.itemCode})</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.itemCode && <p className="text-xs text-destructive">{form.formState.errors.itemCode.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="branchCode">Branch *</Label>
                <Select value={selectedBranch} onValueChange={selectBranch} disabled={scoped || branchesLoading}>
                  <SelectTrigger id="branchCode"><SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select a branch"} /></SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => <SelectItem key={branch.branchCode} value={branch.branchCode}>{branch.branchName} ({branch.branchCode})</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.branchCode && <p className="text-xs text-destructive">{form.formState.errors.branchCode.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="warehouseCode">Warehouse *</Label>
                <Select value={selectedWarehouse} onValueChange={(value) => form.setValue("warehouseCode", value, { shouldValidate: true })} disabled={!selectedBranch || warehousesLoading}>
                  <SelectTrigger id="warehouseCode"><SelectValue placeholder={!selectedBranch ? "Select a branch first" : warehousesLoading ? "Loading warehouses..." : "Select a warehouse"} /></SelectTrigger>
                  <SelectContent>
                    {activeWarehouses.map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={warehouse.warehouseCode}>{warehouse.warehouseName} ({warehouse.warehouseCode})</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.warehouseCode && <p className="text-xs text-destructive">{form.formState.errors.warehouseCode.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="batchNo">Batch Number *</Label>
                <Input id="batchNo" placeholder="e.g. OPEN-ITEM-001-2026" {...form.register("batchNo", { required: "Batch number is required." })} />
                {form.formState.errors.batchNo && <p className="text-xs text-destructive">{form.formState.errors.batchNo.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input id="quantity" type="number" min="0" step="0.01" {...form.register("quantity", { required: "Quantity is required.", validate: (value) => Number(value) > 0 || "Quantity must be greater than 0." })} />
                {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unitCost">Unit Cost *</Label>
                <Input id="unitCost" type="number" min="0" step="0.01" {...form.register("unitCost", { required: "Unit cost is required.", validate: (value) => Number(value) >= 0 || "Unit cost cannot be negative." })} />
                {form.formState.errors.unitCost && <p className="text-xs text-destructive">{form.formState.errors.unitCost.message}</p>}
              </div>

              <div className="space-y-1.5"><Label htmlFor="expiryDate">Expiry Date</Label><Input id="expiryDate" type="date" {...form.register("expiryDate")} /></div>
              <div className="space-y-1.5">
                <Label htmlFor="openingDate">Opening Date *</Label>
                <Input id="openingDate" type="date" {...form.register("openingDate", { required: "Opening date is required." })} />
                {form.formState.errors.openingDate && <p className="text-xs text-destructive">{form.formState.errors.openingDate.message}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="referenceNo">Reference Number</Label><Input id="referenceNo" placeholder="e.g. OPENING-2026" {...form.register("referenceNo")} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="remarks">Remarks</Label><Textarea id="remarks" rows={3} placeholder="Optional notes about this opening balance" {...form.register("remarks")} /></div>
            </div>

            <div className="flex justify-end border-t border-border pt-5">
              <Button type="submit" disabled={createOpeningStock.isPending}>
                <PackagePlus className="h-4 w-4" />
                {createOpeningStock.isPending ? "Applying..." : "Apply Opening Stock"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
