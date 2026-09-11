"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  PackagePlus,
  Boxes,
  MapPin,
  DollarSign,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/shared/form-dialog";
import { ProductSelector } from "@/components/shared/product-selector";
import {
  useBrands,
  useCategories,
  useCreateCategory,
  useCreateProduct,
  useProducts,
  useTaxMasters,
} from "@/hooks/use-catalog";
import { useBranches, useWarehouses } from "@/hooks/use-organization";
import { useCreateOpeningStock } from "@/hooks/use-stock";
import { isBranchScoped } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { ItemGroup, UnitOfMeasure, type Product } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

/** Small section header used across the form cards for consistent visual hierarchy */
function SectionHeader({
  icon: Icon,
  step,
  title,
  description,
  complete,
}: {
  icon: React.ElementType;
  step: number;
  title: string;
  description: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
          complete
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        {complete ? <CheckCircle2 className="h-4.5 w-4.5" /> : step}
      </div>
      <div className="space-y-0.5 pt-0.5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold leading-none">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function OpeningStockPage() {
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const scoped = isBranchScoped(user?.roleName);
  const assignedBranch = scoped ? (user?.branchCode ?? "") : "";
  const form = useForm<FormValues>({ defaultValues: defaults(assignedBranch) });
  const selectedBranch = useWatch({
    control: form.control,
    name: "branchCode",
  });
  const selectedItem = useWatch({ control: form.control, name: "itemCode" });
  const selectedWarehouse = useWatch({
    control: form.control,
    name: "warehouseCode",
  });
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const unitCost = useWatch({ control: form.control, name: "unitCost" });
  const sellingPrice = useWatch({
    control: form.control,
    name: "sellingPrice",
  });
  const { data: products, isLoading: productsLoading } = useProducts({
    isActive: true,
  });
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses(
    selectedBranch || undefined,
  );
  const createOpeningStock = useCreateOpeningStock();

  const activeWarehouses = useMemo(
    () =>
      (warehouses ?? []).filter(
        (warehouse) =>
          warehouse.isActive && warehouse.branchCode === selectedBranch,
      ),
    [warehouses, selectedBranch],
  );

  const selectedProduct = useMemo(
    () => products?.find((product) => product.itemCode === selectedItem),
    [products, selectedItem],
  );
  const selectedBranchLabel = useMemo(
    () => branches?.find((branch) => branch.branchCode === selectedBranch),
    [branches, selectedBranch],
  );
  const selectedWarehouseLabel = useMemo(
    () =>
      activeWarehouses.find(
        (warehouse) => warehouse.warehouseCode === selectedWarehouse,
      ),
    [activeWarehouses, selectedWarehouse],
  );

  const totalValue = useMemo(() => {
    const qty = Number(quantity);
    const cost = Number(unitCost);
    if (!qty || !cost || Number.isNaN(qty) || Number.isNaN(cost)) return null;
    return qty * cost;
  }, [quantity, unitCost]);

  const margin = useMemo(() => {
    const cost = Number(unitCost);
    const price = Number(sellingPrice);
    if (
      !cost ||
      !price ||
      Number.isNaN(cost) ||
      Number.isNaN(price) ||
      price <= 0
    )
      return null;
    return ((price - cost) / price) * 100;
  }, [unitCost, sellingPrice]);

  const productStepComplete = Boolean(selectedItem);
  const locationStepComplete = Boolean(selectedBranch && selectedWarehouse);
  const stockStepComplete = Boolean(quantity && unitCost && sellingPrice);

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
    const datePart = (form.getValues("openingDate") || today()).replaceAll(
      "-",
      "",
    );
    form.setValue("referenceNo", `OPENING-${itemCode}-${datePart}`);
  };

  const selectCreatedProduct = (product: Product) => {
    selectItem(product.itemCode);
    if (product.costPrice != null)
      form.setValue("unitCost", String(product.costPrice));
    if (product.sellingPrice != null)
      form.setValue("sellingPrice", String(product.sellingPrice));
  };

  const onSubmit = form.handleSubmit((values) => {
    if (Number(values.sellingPrice) < Number(values.unitCost)) {
      form.setError("sellingPrice", { message: "Selling price cannot be lower than the unit cost." });
      toast.error("Selling price cannot be lower than the unit cost.");
      return;
    }
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
      { onSuccess: () => form.reset(defaults(assignedBranch)) },
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opening Stock"
        description="Set the initial quantity, cost, and selling price for a product. The batch number is generated automatically."
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <input
          type="hidden"
          {...form.register("itemCode", { required: "Product is required." })}
        />
        <input
          type="hidden"
          {...form.register("branchCode", { required: "Branch is required." })}
        />
        <input
          type="hidden"
          {...form.register("warehouseCode", {
            required: "Warehouse is required.",
          })}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Main form column */}
          <div className="space-y-6 xl:col-span-2">
            {/* Step 1: Product */}
            <Card>
              <CardHeader className="pb-4">
                <SectionHeader
                  icon={Boxes}
                  step={1}
                  title="Product"
                  description="Choose an existing product or create a new one on the fly."
                  complete={productStepComplete}
                />
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="itemCode">Product / Item *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setProductDialogOpen(true)}
                  >
                    <PackagePlus className="h-3.5 w-3.5" /> Create Product
                  </Button>
                </div>
                <ProductSelector
                  products={products ?? []}
                  value={selectedItem}
                  onChange={selectItem}
                  isLoading={productsLoading}
                />
                {form.formState.errors.itemCode && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.itemCode.message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Location */}
            <Card>
              <CardHeader className="pb-4">
                <SectionHeader
                  icon={MapPin}
                  step={2}
                  title="Location"
                  description="Which branch and warehouse will hold this stock."
                  complete={locationStepComplete}
                />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="branchCode">Branch *</Label>
                    <Select
                      value={selectedBranch}
                      onValueChange={selectBranch}
                      disabled={scoped || branchesLoading}
                    >
                      <SelectTrigger id="branchCode">
                        <SelectValue
                          placeholder={
                            branchesLoading
                              ? "Loading branches..."
                              : "Select a branch"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {branches?.map((branch) => (
                          <SelectItem
                            key={branch.branchCode}
                            value={branch.branchCode}
                          >
                            {branch.branchName} ({branch.branchCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.branchCode && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.branchCode.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="warehouseCode">Warehouse *</Label>
                    <Select
                      value={selectedWarehouse}
                      onValueChange={(value) =>
                        form.setValue("warehouseCode", value, {
                          shouldValidate: true,
                        })
                      }
                      disabled={!selectedBranch || warehousesLoading}
                    >
                      <SelectTrigger id="warehouseCode">
                        <SelectValue
                          placeholder={
                            !selectedBranch
                              ? "Select a branch first"
                              : warehousesLoading
                                ? "Loading warehouses..."
                                : "Select a warehouse"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {activeWarehouses.map((warehouse) => (
                          <SelectItem
                            key={warehouse.warehouseCode}
                            value={warehouse.warehouseCode}
                          >
                            {warehouse.warehouseName} ({warehouse.warehouseCode}
                            )
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.warehouseCode && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.warehouseCode.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Stock & Pricing */}
            <Card>
              <CardHeader className="pb-4">
                <SectionHeader
                  icon={DollarSign}
                  step={3}
                  title="Stock & Pricing"
                  description="Opening quantity, cost, and selling price."
                  complete={stockStepComplete}
                />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      {...form.register("quantity", {
                        required: "Quantity is required.",
                        validate: (value) =>
                          Number(value) > 0 ||
                          "Quantity must be greater than 0.",
                      })}
                    />
                    {form.formState.errors.quantity && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.quantity.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="unitCost">Unit Cost *</Label>
                    <Input
                      id="unitCost"
                      type="number"
                      min="0"
                      step="0.01"
                      {...form.register("unitCost", {
                        required: "Unit cost is required.",
                        validate: (value) =>
                          Number(value) >= 0 || "Unit cost cannot be negative.",
                      })}
                    />
                    {form.formState.errors.unitCost && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.unitCost.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sellingPrice">Selling Price *</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      {...form.register("sellingPrice", {
                        required: "Selling price is required.",
                        validate: (value) =>
                          Number(value) <= 0 ? "Selling price must be greater than 0." : Number(value) >= Number(form.getValues("unitCost")) || "Selling price cannot be lower than the unit cost.",
                      })}
                    />
                    {form.formState.errors.sellingPrice && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.sellingPrice.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      {...form.register("expiryDate")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="openingDate">Opening Date *</Label>
                    <Input
                      id="openingDate"
                      type="date"
                      {...form.register("openingDate", {
                        required: "Opening date is required.",
                      })}
                    />
                    {form.formState.errors.openingDate && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.openingDate.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: Reference & Notes */}
            <Card>
              <CardHeader className="pb-4">
                <SectionHeader
                  icon={FileText}
                  step={4}
                  title="Reference & Notes"
                  description="Optional details for your own records."
                  complete={false}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="referenceNo">Reference Number</Label>
                  <Input
                    id="referenceNo"
                    placeholder="Select a product to generate a reference"
                    {...form.register("referenceNo")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Generated after product selection. You can change it before
                    submitting.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    rows={3}
                    placeholder="Optional notes about this opening balance"
                    {...form.register("remarks")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary sidebar */}
          <div className="xl:col-span-1">
            <Card className="xl:sticky xl:top-6">
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
                <CardDescription>Review before applying.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Product</span>
                    <span className="text-right font-medium">
                      {selectedProduct ? (
                        selectedProduct.itemName
                      ) : (
                        <span className="text-muted-foreground">
                          Not selected
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Branch</span>
                    <span className="text-right font-medium">
                      {selectedBranchLabel ? (
                        selectedBranchLabel.branchName
                      ) : (
                        <span className="text-muted-foreground">
                          Not selected
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Warehouse</span>
                    <span className="text-right font-medium">
                      {selectedWarehouseLabel ? (
                        selectedWarehouseLabel.warehouseName
                      ) : (
                        <span className="text-muted-foreground">
                          Not selected
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-medium">{quantity || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Unit Cost</span>
                    <span className="font-medium">
                      {unitCost ? Number(unitCost).toFixed(2) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Selling Price</span>
                    <span className="font-medium">
                      {sellingPrice ? Number(sellingPrice).toFixed(2) : "—"}
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Opening Value</span>
                    <span className="font-semibold">
                      {totalValue != null ? totalValue.toFixed(2) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Margin</span>
                    {margin != null ? (
                      <Badge
                        variant={margin >= 0 ? "secondary" : "destructive"}
                        className="font-medium"
                      >
                        {margin.toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="font-medium text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createOpeningStock.isPending}
                >
                  <PackagePlus className="h-4 w-4" />
                  {createOpeningStock.isPending
                    ? "Applying..."
                    : "Apply Opening Stock"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  You can review every field above before this is saved.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      <CreateProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onCreated={selectCreatedProduct}
      />
    </div>
  );
}

interface ProductFormValues {
  itemName: string;
  description: string;
  categoryId: string;
  brandId: string;
  unitOfMeasure: (typeof UnitOfMeasure)[number];
  itemGroup: (typeof ItemGroup)[number] | "";
  barcode: string;
  costPrice: string;
  sellingPrice: string;
  reorderLevel: string;
  taxCode: string;
  isActive: boolean;
}

function CreateProductDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: Product) => void;
}) {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const createProduct = useCreateProduct();
  const { data: categories } = useCategories(true);
  const { data: brands } = useBrands(true);
  const { data: taxes } = useTaxMasters(true);
  const form = useForm<ProductFormValues>({
    defaultValues: {
      itemName: "",
      description: "",
      categoryId: "",
      brandId: "",
      unitOfMeasure: "PCS",
      itemGroup: "",
      barcode: "",
      costPrice: "",
      sellingPrice: "",
      reorderLevel: "",
      taxCode: "",
      isActive: true,
    },
  });

  const submit = form.handleSubmit((values) => {
    if (values.costPrice !== "" && values.sellingPrice !== "" && Number(values.sellingPrice) < Number(values.costPrice)) {
      form.setError("sellingPrice", { message: "Selling price cannot be lower than the cost price." });
      toast.error("Selling price cannot be lower than the cost price.");
      return;
    }
    createProduct.mutate(
      {
        itemCode: null,
        itemName: values.itemName.trim(),
        description: values.description.trim() || null,
        categoryId: Number(values.categoryId),
        brandId: values.brandId ? Number(values.brandId) : null,
        unitOfMeasure: values.unitOfMeasure,
        itemGroup: values.itemGroup || null,
        barcode: values.barcode.trim() || null,
        costPrice: values.costPrice === "" ? null : Number(values.costPrice),
        sellingPrice:
          values.sellingPrice === "" ? null : Number(values.sellingPrice),
        reorderLevel: Number(values.reorderLevel),
        taxCode: values.taxCode || null,
        isActive: values.isActive,
      },
      {
        onSuccess: (product) => {
          onCreated(product);
          form.reset();
          onOpenChange(false);
        },
      },
    );
  });

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Create Product"
        description="Create a product without leaving the opening stock form."
        onSubmit={submit}
        isSubmitting={createProduct.isPending}
        submitLabel="Create Product"
        className="sm:max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Item Name *</Label>
            <Input
              autoFocus
              {...form.register("itemName", {
                required: "Item name is required.",
              })}
            />
            {form.formState.errors.itemName && (
              <p className="text-xs text-destructive">
                {form.formState.errors.itemName.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} {...form.register("description")} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>Category *</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setCategoryDialogOpen(true)}
              >
                <PackagePlus className="h-3.5 w-3.5" /> Create Category
              </Button>
            </div>
            <input
              type="hidden"
              {...form.register("categoryId", {
                required: "Category is required.",
              })}
            />
            <Select
              value={form.watch("categoryId")}
              onValueChange={(value) =>
                form.setValue("categoryId", value, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem
                    key={category.categoryId}
                    value={String(category.categoryId)}
                  >
                    {category.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.categoryId.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select
              value={form.watch("brandId")}
              onValueChange={(value) => form.setValue("brandId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands?.map((brand) => (
                  <SelectItem key={brand.brandId} value={String(brand.brandId)}>
                    {brand.brandName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unit of Measure *</Label>
            <Select
              value={form.watch("unitOfMeasure")}
              onValueChange={(value) =>
                form.setValue(
                  "unitOfMeasure",
                  value as ProductFormValues["unitOfMeasure"],
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UnitOfMeasure.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Item Group</Label>
            <Select
              value={form.watch("itemGroup") || "__none__"}
              onValueChange={(value) =>
                form.setValue(
                  "itemGroup",
                  value === "__none__"
                    ? ""
                    : (value as ProductFormValues["itemGroup"]),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No item group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No item group</SelectItem>
                {ItemGroup.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Barcode</Label>
            <Input {...form.register("barcode")} />
          </div>
          <div className="space-y-1.5">
            <Label>Tax Rate</Label>
            <Select
              value={form.watch("taxCode")}
              onValueChange={(value) => form.setValue("taxCode", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No tax" />
              </SelectTrigger>
              <SelectContent>
                {taxes?.map((tax) => (
                  <SelectItem key={tax.taxCode} value={tax.taxCode}>
                    {tax.taxName} ({tax.percentage}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cost Price</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...form.register("costPrice", {
                validate: (value) =>
                  value === "" ||
                  Number(value) >= 0 ||
                  "Cost price cannot be negative.",
              })}
            />
            {form.formState.errors.costPrice && (
              <p className="text-xs text-destructive">
                {form.formState.errors.costPrice.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Selling Price</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...form.register("sellingPrice", {
                validate: (value) =>
                  value === "" || Number(value) >= Number(form.getValues("costPrice") || 0) || "Selling price cannot be lower than the cost price.",
              })}
            />
            {form.formState.errors.sellingPrice && (
              <p className="text-xs text-destructive">
                {form.formState.errors.sellingPrice.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Reorder Level *</Label>
            <Input
              type="number"
              min="0"
              step="1"
              {...form.register("reorderLevel", {
                required: "Reorder level is required.",
                validate: (value) =>
                  Number(value) >= 0 || "Reorder level cannot be negative.",
              })}
            />
            {form.formState.errors.reorderLevel && (
              <p className="text-xs text-destructive">
                {form.formState.errors.reorderLevel.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch
              checked={form.watch("isActive")}
              onCheckedChange={(value) => form.setValue("isActive", value)}
            />
            <Label>Active</Label>
          </div>
        </div>
      </FormDialog>
      <CreateCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onCreated={(categoryId) =>
          form.setValue("categoryId", String(categoryId), {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
      />
    </>
  );
}

function CreateCategoryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (categoryId: number) => void;
}) {
  const createCategory = useCreateCategory();
  const form = useForm({
    defaultValues: { categoryName: "", description: "" },
  });
  const submit = form.handleSubmit((values) => {
    createCategory.mutate(
      {
        categoryName: values.categoryName.trim(),
        description: values.description.trim() || null,
        parentCategoryId: null,
        isActive: true,
      },
      {
        onSuccess: (category) => {
          onCreated(category.categoryId);
          form.reset();
          onOpenChange(false);
        },
      },
    );
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Category"
      description="The new category will be selected automatically in the product form."
      onSubmit={submit}
      isSubmitting={createCategory.isPending}
      submitLabel="Create Category"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Category Name *</Label>
          <Input
            autoFocus
            {...form.register("categoryName", {
              required: "Category name is required.",
            })}
          />
          {form.formState.errors.categoryName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.categoryName.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea rows={2} {...form.register("description")} />
        </div>
      </div>
    </FormDialog>
  );
}
