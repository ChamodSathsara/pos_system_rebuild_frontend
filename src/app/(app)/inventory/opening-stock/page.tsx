"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormDialog } from "@/components/shared/form-dialog";
import { ProductSelector } from "@/components/shared/product-selector";
import { useBrands, useCategories, useCreateProduct, useProducts, useTaxMasters } from "@/hooks/use-catalog";
import { useBranches, useWarehouses } from "@/hooks/use-organization";
import { useCreateOpeningStock } from "@/hooks/use-stock";
import { isBranchScoped } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { ItemGroup, UnitOfMeasure, type Product } from "@/types";

interface FormValues {
  itemCode: string;
  branchCode: string;
  warehouseCode: string;
  quantity: string;
  unitCost: string;
  sellingPrice: string;
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
    quantity: "",
    unitCost: "",
    sellingPrice: "",
    expiryDate: "",
    openingDate: today(),
    referenceNo: "",
    remarks: "",
  };
}

export default function OpeningStockPage() {
  const [productDialogOpen, setProductDialogOpen] = useState(false);
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

  const selectItem = (itemCode: string) => {
    form.setValue("itemCode", itemCode, { shouldValidate: true });
    const datePart = (form.getValues("openingDate") || today()).replaceAll("-", "");
    form.setValue("referenceNo", `OPENING-${itemCode}-${datePart}`);
  };

  const selectCreatedProduct = (product: Product) => {
    selectItem(product.itemCode);
    if (product.costPrice != null) form.setValue("unitCost", String(product.costPrice));
    if (product.sellingPrice != null) form.setValue("sellingPrice", String(product.sellingPrice));
  };

  const onSubmit = form.handleSubmit((values) => {
    createOpeningStock.mutate(
      {
        itemCode: values.itemCode,
        branchCode: values.branchCode,
        warehouseCode: values.warehouseCode,
        quantity: Number(values.quantity),
        unitCost: Number(values.unitCost),
        sellingPrice: Number(values.sellingPrice),
        expiryDate: values.expiryDate || null,
        openingDate: values.openingDate,
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
        description="Set the initial quantity, cost, and selling price for a product. The batch number is generated automatically."
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
                <div className="flex items-center justify-between gap-2"><Label htmlFor="itemCode">Product / Item *</Label><Button type="button" variant="ghost" size="xs" onClick={() => setProductDialogOpen(true)}><PackagePlus className="h-3.5 w-3.5" /> Create Product</Button></div>
                <ProductSelector products={products ?? []} value={selectedItem} onChange={selectItem} isLoading={productsLoading} />
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
                <Label htmlFor="quantity">Quantity *</Label>
                <Input id="quantity" type="number" min="0" step="0.01" {...form.register("quantity", { required: "Quantity is required.", validate: (value) => Number(value) > 0 || "Quantity must be greater than 0." })} />
                {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unitCost">Unit Cost *</Label>
                <Input id="unitCost" type="number" min="0" step="0.01" {...form.register("unitCost", { required: "Unit cost is required.", validate: (value) => Number(value) >= 0 || "Unit cost cannot be negative." })} />
                {form.formState.errors.unitCost && <p className="text-xs text-destructive">{form.formState.errors.unitCost.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sellingPrice">Selling Price *</Label>
                <Input id="sellingPrice" type="number" min="0" step="0.01" {...form.register("sellingPrice", { required: "Selling price is required.", validate: (value) => Number(value) > 0 || "Selling price must be greater than 0." })} />
                {form.formState.errors.sellingPrice && <p className="text-xs text-destructive">{form.formState.errors.sellingPrice.message}</p>}
              </div>

              <div className="space-y-1.5"><Label htmlFor="expiryDate">Expiry Date</Label><Input id="expiryDate" type="date" {...form.register("expiryDate")} /></div>
              <div className="space-y-1.5">
                <Label htmlFor="openingDate">Opening Date *</Label>
                <Input id="openingDate" type="date" {...form.register("openingDate", { required: "Opening date is required." })} />
                {form.formState.errors.openingDate && <p className="text-xs text-destructive">{form.formState.errors.openingDate.message}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="referenceNo">Reference Number</Label><Input id="referenceNo" placeholder="Select a product to generate a reference" {...form.register("referenceNo")} /><p className="text-xs text-muted-foreground">Generated after product selection. You can change it before submitting.</p></div>
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
      <CreateProductDialog open={productDialogOpen} onOpenChange={setProductDialogOpen} onCreated={selectCreatedProduct} />
    </div>
  );
}

interface ProductFormValues {
  itemName: string; description: string; categoryId: string; brandId: string; unitOfMeasure: (typeof UnitOfMeasure)[number];
  itemGroup: (typeof ItemGroup)[number]; barcode: string; costPrice: string; sellingPrice: string; reorderLevel: string; taxCode: string; isActive: boolean;
}

function CreateProductDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (product: Product) => void }) {
  const createProduct = useCreateProduct();
  const { data: categories } = useCategories(true);
  const { data: brands } = useBrands(true);
  const { data: taxes } = useTaxMasters(true);
  const form = useForm<ProductFormValues>({ defaultValues: { itemName: "", description: "", categoryId: "", brandId: "", unitOfMeasure: "PCS", itemGroup: "Consumables", barcode: "", costPrice: "", sellingPrice: "", reorderLevel: "", taxCode: "", isActive: true } });

  const submit = form.handleSubmit((values) => {
    createProduct.mutate({
      itemCode: null,
      itemName: values.itemName.trim(),
      description: values.description.trim() || null,
      categoryId: values.categoryId ? Number(values.categoryId) : null,
      brandId: values.brandId ? Number(values.brandId) : null,
      unitOfMeasure: values.unitOfMeasure,
      itemGroup: values.itemGroup,
      barcode: values.barcode.trim() || null,
      costPrice: values.costPrice === "" ? null : Number(values.costPrice),
      sellingPrice: values.sellingPrice === "" ? null : Number(values.sellingPrice),
      reorderLevel: values.reorderLevel === "" ? null : Number(values.reorderLevel),
      taxCode: values.taxCode || null,
      isActive: values.isActive,
    }, { onSuccess: (product) => { onCreated(product); form.reset(); onOpenChange(false); } });
  });

  return <FormDialog open={open} onOpenChange={onOpenChange} title="Create Product" description="Create a product without leaving the opening stock form." onSubmit={submit} isSubmitting={createProduct.isPending} submitLabel="Create Product" className="sm:max-w-2xl">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2"><Label>Item Name *</Label><Input autoFocus {...form.register("itemName", { required: "Item name is required." })} />{form.formState.errors.itemName && <p className="text-xs text-destructive">{form.formState.errors.itemName.message}</p>}</div>
      <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea rows={2} {...form.register("description")} /></div>
      <div className="space-y-1.5"><Label>Category</Label><Select value={form.watch("categoryId")} onValueChange={(value) => form.setValue("categoryId", value)}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories?.map((category) => <SelectItem key={category.categoryId} value={String(category.categoryId)}>{category.categoryName}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label>Brand</Label><Select value={form.watch("brandId")} onValueChange={(value) => form.setValue("brandId", value)}><SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger><SelectContent>{brands?.map((brand) => <SelectItem key={brand.brandId} value={String(brand.brandId)}>{brand.brandName}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label>Unit of Measure *</Label><Select value={form.watch("unitOfMeasure")} onValueChange={(value) => form.setValue("unitOfMeasure", value as ProductFormValues["unitOfMeasure"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{UnitOfMeasure.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label>Item Group *</Label><Select value={form.watch("itemGroup")} onValueChange={(value) => form.setValue("itemGroup", value as ProductFormValues["itemGroup"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ItemGroup.map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label>Barcode</Label><Input {...form.register("barcode")} /></div>
      <div className="space-y-1.5"><Label>Tax Rate</Label><Select value={form.watch("taxCode")} onValueChange={(value) => form.setValue("taxCode", value)}><SelectTrigger><SelectValue placeholder="No tax" /></SelectTrigger><SelectContent>{taxes?.map((tax) => <SelectItem key={tax.taxCode} value={tax.taxCode}>{tax.taxName} ({tax.percentage}%)</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label>Cost Price</Label><Input type="number" min="0" step="0.01" {...form.register("costPrice", { validate: (value) => value === "" || Number(value) >= 0 || "Cost price cannot be negative." })} />{form.formState.errors.costPrice && <p className="text-xs text-destructive">{form.formState.errors.costPrice.message}</p>}</div>
      <div className="space-y-1.5"><Label>Selling Price</Label><Input type="number" min="0" step="0.01" {...form.register("sellingPrice", { validate: (value) => value === "" || Number(value) >= 0 || "Selling price cannot be negative." })} />{form.formState.errors.sellingPrice && <p className="text-xs text-destructive">{form.formState.errors.sellingPrice.message}</p>}</div>
      <div className="space-y-1.5"><Label>Reorder Level</Label><Input type="number" min="0" step="1" {...form.register("reorderLevel", { validate: (value) => value === "" || Number(value) >= 0 || "Reorder level cannot be negative." })} />{form.formState.errors.reorderLevel && <p className="text-xs text-destructive">{form.formState.errors.reorderLevel.message}</p>}</div>
      <div className="flex items-center gap-2 pt-6"><Switch checked={form.watch("isActive")} onCheckedChange={(value) => form.setValue("isActive", value)} /><Label>Active</Label></div>
    </div>
  </FormDialog>;
}
