"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Banknote,
  Loader2,
  Minus,
  Plus,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  ShoppingCart,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { useCreateSale, usePosTerminalItems, useSaleInvoice } from "@/hooks/use-sale";
import { useCustomer, useCreateCustomer } from "@/hooks/use-party";
import { useEvaluateDiscount } from "@/hooks/use-misc";
import { useAuthStore } from "@/store/auth-store";
import { useCategories } from "@/hooks/use-catalog";
import { useWarehouses } from "@/hooks/use-organization";
import { ErrorState } from "@/components/shared/error-state";
import { formatMoney } from "@/lib/format";
import { PaymentMethod, type PosTerminalItem } from "@/types";
import { toast } from "sonner";
import { salesApi } from "@/lib/api";

interface CartLine {
  itemCode: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxPercentage: number;
  availableQty: number;
}

interface PaymentLine {
  id: string;
  paymentMethod: PaymentMethod;
  amount: string;
}

async function printSaleInvoice(invoiceNo: string) {
  const html = await salesApi.invoiceHtml(invoiceNo);
  if (window.gestetnerDesktop?.isDesktop) {
    await window.gestetnerDesktop.printInvoice(html);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const printFrame = document.createElement("iframe");
    printFrame.setAttribute("aria-hidden", "true");
    Object.assign(printFrame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    const cleanup = () => window.setTimeout(() => printFrame.remove(), 500);
    printFrame.onerror = () => {
      cleanup();
      reject(new Error("The invoice print document could not be loaded."));
    };
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        cleanup();
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    document.body.appendChild(printFrame);
    printFrame.srcdoc = html;
  });
}

export default function PosTerminalPage() {
  const user = useAuthStore((s) => s.user);
  const branchCode = user?.branchCode ?? "";

  const [query, setQuery] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [warehouseCode, setWarehouseCode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerCode, setCustomerCode] = useState("");
  const [billDiscount, setBillDiscount] = useState(0);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);
  const [lastPaymentSummary, setLastPaymentSummary] = useState({ tendered: 0, change: 0 });
  const searchRef = useRef<HTMLInputElement>(null);
  const paymentAmountRef = useRef<HTMLInputElement>(null);
  const completePaymentButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: categories } = useCategories(true);
  const { data: warehouses } = useWarehouses(branchCode || undefined);
  const {
    data: terminalItems,
    isLoading: itemsLoading,
    isFetching: itemsFetching,
    isError: itemsError,
    error: itemListError,
    refetch: refetchItems,
  } = usePosTerminalItems({
    keyword: debouncedKeyword || undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    warehouseCode: warehouseCode || undefined,
    onlyAvailable: true,
  });
  const results = (terminalItems ?? []).filter((item) => item.isAvailable && item.availableQty > 0);
  const { data: customer } = useCustomer(customerCode || undefined);
  const evaluateM = useEvaluateDiscount();
  const createSale = useCreateSale();

  const addToCart = (p: PosTerminalItem) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.itemCode === p.itemCode);
      if (existing) {
        if (existing.quantity >= p.availableQty) {
          toast.error(`Only ${p.availableQty} ${p.unitOfMeasure} available for ${p.itemName}.`);
          return prev;
        }
        return prev.map((l) => (l.itemCode === p.itemCode ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          itemCode: p.itemCode,
          itemName: p.itemName,
          unitPrice: p.price,
          quantity: 1,
          discountAmount: 0,
          taxPercentage: p.taxPercentage ?? 0,
          availableQty: p.availableQty,
        },
      ];
    });
    setQuery("");
    searchRef.current?.focus();
  };

  const handleBarcodeEnter = () => {
    const exact = results?.find((p) => p.barcode === query || p.itemCode.toLowerCase() === query.toLowerCase());
    if (exact) addToCart(exact);
    else if (results && results.length === 1) addToCart(results[0]);
  };

  const updateQty = (itemCode: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.itemCode !== itemCode));
      return;
    }
    setCart((prev) => prev.map((l) => {
      if (l.itemCode !== itemCode) return l;
      if (qty > l.availableQty) {
        toast.error(`Only ${l.availableQty} units available for ${l.itemName}.`);
        return l;
      }
      return { ...l, quantity: qty };
    }));
  };

  const removeLine = (itemCode: string) => setCart((prev) => prev.filter((l) => l.itemCode !== itemCode));

  // Auto-evaluate item-level discounts whenever a line's qty/price changes.
  const cartSignature = cart.map((l) => `${l.itemCode}:${l.quantity}:${l.unitPrice}`).join(",");
  useEffect(() => {
    const timer = setTimeout(() => {
      cart.forEach((line) => {
        evaluateM.mutate(
          { itemCode: line.itemCode, quantity: line.quantity, itemAmount: line.unitPrice * line.quantity },
          {
            onSuccess: (res) => {
              setCart((prev) =>
                prev.map((l) => (l.itemCode === line.itemCode ? { ...l, discountAmount: res.totalItemDiscount } : l))
              );
            },
          }
        );
      });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature]);

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const lineDiscounts = cart.reduce((sum, l) => sum + l.discountAmount, 0);

  // Auto-evaluate bill-level discounts whenever subtotal changes.
  useEffect(() => {
    if (subtotal <= 0) {
      const timer = setTimeout(() => setBillDiscount(0), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      evaluateM.mutate(
        { billAmount: subtotal - lineDiscounts },
        { onSuccess: (res) => setBillDiscount(res.totalBillDiscount) }
      );
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, lineDiscounts]);

  const estTax = cart.reduce((sum, l) => {
    const lineNet = l.unitPrice * l.quantity - l.discountAmount;
    return sum + (lineNet * l.taxPercentage) / 100;
  }, 0);
  const total = Math.max(0, subtotal - lineDiscounts - billDiscount + estTax);
  const paidTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = total - paidTotal;

  const addPayment = (method: PaymentMethod = "Cash", amount?: number) => {
    setPayments((prev) => [...prev, { id: crypto.randomUUID(), paymentMethod: method, amount: amount != null ? String(amount.toFixed(2)) : "" }]);
  };
  const updatePayment = (id: string, patch: Partial<PaymentLine>) => setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removePayment = (id: string) => setPayments((prev) => prev.filter((p) => p.id !== id));

  const setSingleCashPayment = (amount: number) => {
    setPayments([{ id: crypto.randomUUID(), paymentMethod: "Cash", amount: amount.toFixed(2) }]);
    requestAnimationFrame(() => {
      paymentAmountRef.current?.focus();
      paymentAmountRef.current?.select();
    });
  };

  const payExactCash = () => setSingleCashPayment(total);
  const roundedCashAmount = Math.ceil((total + 0.01) / 1000) * 1000;

  const openPaymentDialog = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }
    if (!branchCode) {
      toast.error("Your account does not have an assigned branch.");
      return;
    }
    setPayments([{ id: crypto.randomUUID(), paymentMethod: "Cash", amount: total.toFixed(2) }]);
    setPaymentDialogOpen(true);
  };

  const resetCart = () => {
    setCart([]);
    setCustomerCode("");
    setPayments([]);
    setBillDiscount(0);
  };

  const checkout = () => {
    if (billDiscount < 0) {
      toast.error("Discount cannot be negative.");
      return;
    }
    if (billDiscount > subtotal - lineDiscounts) {
      toast.error("Bill discount cannot exceed the amount after item discounts.");
      return;
    }
    if (payments.length === 0 || paidTotal < total - 0.01) {
      toast.error("Enter the full payment amount before completing the sale.");
      return;
    }
    let remainingPayment = total;
    const recordedPayments = payments
      .filter((payment) => Number(payment.amount) > 0 && remainingPayment > 0)
      .map((payment) => {
        const amount = Math.min(Number(payment.amount), remainingPayment);
        remainingPayment -= amount;
        return { paymentMethod: payment.paymentMethod, amount };
      });
    createSale.mutate(
      {
        invoiceNo: null,
        branchCode,
        customerCode: customerCode || null,
        discountAmount: billDiscount || null,
        items: cart.map((l) => ({ itemCode: l.itemCode, quantity: l.quantity, unitPrice: l.unitPrice, discountAmount: l.discountAmount || null })),
        payments: recordedPayments,
      },
      {
        onSuccess: (sale) => {
          toast.success(`Sale ${sale.invoiceNo} completed`);
          setPaymentDialogOpen(false);
          setLastInvoice(null);
          resetCart();
          void printSaleInvoice(sale.invoiceNo)
            .then(() => {
              toast.success(`Invoice ${sale.invoiceNo} printed successfully.`);
              searchRef.current?.focus();
            })
            .catch((error) => {
              setLastPaymentSummary({ tendered: paidTotal, change: Math.max(0, paidTotal - total) });
              setLastInvoice(sale.invoiceNo);
              toast.error(error instanceof Error ? error.message : "Invoice could not be printed automatically.");
            });
        },
      }
    );
  };

  return (
    <div className="grid h-[calc(100vh-6.5rem)] grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Left: product search & results */}
      <div className="flex flex-col gap-3 lg:col-span-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBarcodeEnter()}
              placeholder="Scan barcode or search product name…"
              className="h-11 pl-9 text-base"
            />
          </div>
          <Select value={categoryId || "__all__"} onValueChange={(value) => setCategoryId(value === "__all__" ? "" : value)}>
            <SelectTrigger className="h-11 w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Categories</SelectItem>{categories?.map((category) => <SelectItem key={category.categoryId} value={String(category.categoryId)}>{category.categoryName}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={warehouseCode || "__all__"} onValueChange={(value) => setWarehouseCode(value === "__all__" ? "" : value)}>
            <SelectTrigger className="h-11 w-40"><SelectValue placeholder="Warehouse" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Warehouses</SelectItem>{warehouses?.filter((warehouse) => warehouse.isActive).map((warehouse) => <SelectItem key={warehouse.warehouseCode} value={warehouse.warehouseCode}>{warehouse.warehouseName}</SelectItem>)}</SelectContent>
          </Select>
          {branchCode && <Badge variant="outline" className="h-11 px-3">{branchCode}</Badge>}
        </div>

        <ScrollArea className="flex-1 rounded-xl border border-border bg-card p-3">
          {itemsLoading || itemsFetching ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading items...</div>
          ) : itemsError ? (
            <ErrorState message={itemListError?.message} onRetry={() => refetchItems()} />
          ) : results.length === 0 ? (
            <EmptyState title="No available items found" description={query ? `No available items match "${query}".` : "No items match the selected filters."} />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {results.map((p) => (
                <button
                  key={p.itemCode}
                  onClick={() => addToCart(p)}
                  className="flex flex-col items-start gap-1 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <p className="line-clamp-2 text-sm font-medium text-foreground">{p.itemName}</p>
                  <p className="text-xs text-muted-foreground">{p.itemCode}</p>
                  <p className="num mt-1 text-sm font-semibold text-primary">{formatMoney(p.price)}</p>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <span>{p.availableQty} available</span>
                    {p.barcode && <span>· {p.barcode}</span>}
                    {p.categoryName && <span>· {p.categoryName}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: cart & checkout */}
      <div className="flex flex-col gap-3 lg:col-span-2">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Cart ({cart.length})</span>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="xs" onClick={resetCart} className="text-muted-foreground">
                Clear
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 px-3">
            {cart.length === 0 ? (
              <div className="py-10">
                <EmptyState icon={ShoppingCart} title="Cart is empty" description="Search and click a product to add it." />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cart.map((line) => (
                  <div key={line.itemCode} className="flex items-center gap-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{line.itemName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="num">{formatMoney(line.unitPrice)}</span>
                        {line.discountAmount > 0 && <Badge variant="success" className="px-1.5 py-0 text-[10px]">-{formatMoney(line.discountAmount)}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(line.itemCode, line.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="num w-6 text-center text-sm font-semibold">{line.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(line.itemCode, line.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="num w-20 text-right text-sm font-semibold">{formatMoney(line.unitPrice * line.quantity - line.discountAmount)}</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLine(line.itemCode)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="space-y-2 border-t border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Customer code (optional)"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                className="h-9"
              />
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setCustomerDialogOpen(true)} title="New customer">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            {customerCode && customer && <p className="text-xs text-success">✓ {customer.customerName} · {customer.customerType}</p>}

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="num">{formatMoney(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Item Discounts</span><span className="num text-success">-{formatMoney(lineDiscounts)}</span></div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Bill Discount</span>
                <span className="num text-success">-{formatMoney(billDiscount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground"><span>Est. Tax</span><span className="num">{formatMoney(estTax)}</span></div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold text-foreground"><span>Total</span><span className="num">{formatMoney(total)}</span></div>
            </div>

            <Button className="h-11 w-full text-base" disabled={cart.length === 0} onClick={openPaymentDialog}>
              <Banknote className="h-4 w-4" /> Proceed to Payment — {formatMoney(total)}
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={(open) => !createSale.isPending && setPaymentDialogOpen(open)}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-[400px]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              paymentAmountRef.current?.focus();
              paymentAmountRef.current?.select();
            });
          }}
        >
          <DialogHeader className="border-b px-5 py-4 text-left">
            <DialogTitle className="text-xl">Complete Payment</DialogTitle>
            <p className="text-xs text-muted-foreground">{cart.length} {cart.length === 1 ? "item" : "items"} in this sale</p>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Label htmlFor="bill-discount" className="font-semibold">Bill discount</Label>
                <p className="text-[11px] text-muted-foreground">Item discounts already applied: {formatMoney(lineDiscounts)}</p>
              </div>
              <Input
                id="bill-discount"
                type="number"
                min="0"
                step="0.01"
                className="h-9 w-24 text-right font-bold"
                value={billDiscount}
                onChange={(event) => setBillDiscount(Number(event.target.value) || 0)}
              />
            </div>

            <div className="space-y-2 rounded-xl bg-muted/70 p-4 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="num">{formatMoney(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Total Discounts</span><span className="num text-success">-{formatMoney(lineDiscounts + billDiscount)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax</span><span className="num">{formatMoney(estTax)}</span></div>
              <div className="flex items-end justify-between border-t border-border pt-3"><span className="font-bold">Amount due</span><span className="num text-2xl font-extrabold text-primary">{formatMoney(total)}</span></div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" className="border border-primary bg-primary/10 text-primary hover:bg-primary/15" onClick={payExactCash}>Full cash</Button>
                <Button type="button" variant="outline" onClick={() => addPayment()}><Plus /> Split payment</Button>
              </div>
              {payments.map((payment, index) => (
                <div key={payment.id} className="flex items-center gap-2">
                  <Select value={payment.paymentMethod} onValueChange={(value) => updatePayment(payment.id, { paymentMethod: value as PaymentMethod })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{PaymentMethod.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Rs</span>
                    <Input
                      ref={index === 0 ? paymentAmountRef : undefined}
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-11 pl-9 text-right num text-lg font-bold"
                      value={payment.amount}
                      onChange={(event) => updatePayment(payment.id, { amount: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        if (balance <= 0.01) {
                          completePaymentButtonRef.current?.focus();
                        }
                      }}
                      aria-label="Payment amount"
                    />
                  </div>
                  {payments.length > 1 && <Button type="button" size="icon" variant="ghost" className="shrink-0 text-destructive" onClick={() => removePayment(payment.id)}><X /></Button>}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="rounded-full text-xs" onClick={payExactCash}>Exact · {formatMoney(total)}</Button>
                {roundedCashAmount > total && <Button type="button" size="sm" variant="outline" className="rounded-full text-xs" onClick={() => setSingleCashPayment(roundedCashAmount)}>{formatMoney(roundedCashAmount)}</Button>}
              </div>
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${balance > 0.01 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                <span className="text-xs font-bold uppercase tracking-wide">{balance > 0.01 ? "Balance due" : balance < -0.01 ? "Change due" : "Fully paid"}</span>
                <span className="num text-xl font-extrabold">{formatMoney(Math.abs(balance))}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="grid grid-cols-[auto_1fr] gap-2 border-t px-5 py-3">
            <Button type="button" variant="outline" disabled={createSale.isPending} onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button ref={completePaymentButtonRef} type="button" className="w-full" disabled={createSale.isPending || payments.length === 0 || balance > 0.01} onClick={checkout}>
              {createSale.isPending ? <Loader2 className="animate-spin" /> : <ReceiptIcon />} Complete payment · {formatMoney(total)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewCustomerDialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen} onCreated={(code) => setCustomerCode(code)} />
      <ReceiptDialog invoiceNo={lastInvoice} tendered={lastPaymentSummary.tendered} change={lastPaymentSummary.change} onClose={() => setLastInvoice(null)} />
    </div>
  );
}

function NewCustomerDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (code: string) => void }) {
  const createM = useCreateCustomer();
  const form = useForm({ defaultValues: { customerName: "", mobile: "", email: "" } });

  const onSubmit = form.handleSubmit((v) => {
    if (!v.customerName) {
      toast.error("Customer name is required.");
      return;
    }
    createM.mutate(
      { customerCode: null, customerName: v.customerName, mobile: v.mobile || null, email: v.email || null },
      {
        onSuccess: (c) => {
          onCreated(c.customerCode);
          onOpenChange(false);
          form.reset();
        },
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label>Name *</Label><Input {...form.register("customerName")} /></div>
          <div className="space-y-1.5"><Label>Mobile</Label><Input {...form.register("mobile")} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" {...form.register("email")} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createM.isPending}>{createM.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptDialog({ invoiceNo, tendered, change, onClose }: { invoiceNo: string | null; tendered: number; change: number; onClose: () => void }) {
  const { data: invoice, isLoading } = useSaleInvoice(invoiceNo ?? undefined);
  const [isPrinting, setIsPrinting] = useState(false);

  const printInvoice = async () => {
    if (!invoiceNo || isPrinting) return;
    setIsPrinting(true);
    try {
      await printSaleInvoice(invoiceNo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load the printable invoice.");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={!!invoiceNo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Sale Complete — {invoiceNo}</DialogTitle></DialogHeader>
        {isLoading || !invoice ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading receipt…</p>
        ) : (
          <div className="num rounded-lg bg-secondary/40 p-4 font-mono text-xs">
            <p className="text-center font-semibold">{invoice.companyName}</p>
            <p className="text-center text-muted-foreground">{invoice.branchName}</p>
            <div className="receipt-notch my-2 h-px opacity-50" />
            {invoice.items.map((it, i) => (
              <div key={i} className="flex justify-between">
                <span className="max-w-[60%] truncate">{it.itemName} x{it.quantity}</span>
                <span>{formatMoney(it.amount)}</span>
              </div>
            ))}
            <div className="receipt-notch my-2 h-px opacity-50" />
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(invoice.totalAmount)}</span></div>
            <div className="flex justify-between"><span>Paid</span><span>{formatMoney(invoice.paidAmount)}</span></div>
            <div className="flex justify-between"><span>Balance</span><span>{formatMoney(invoice.balanceAmount)}</span></div>
            <div className="receipt-notch my-2 h-px opacity-50" />
            <div className="flex justify-between font-semibold"><span>Tendered</span><span>{formatMoney(tendered)}</span></div>
            <div className="flex justify-between text-sm font-bold"><span>Change</span><span>{formatMoney(change)}</span></div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={printInvoice} disabled={!invoiceNo || isPrinting}>
            {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} {isPrinting ? "Loading..." : "Print"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
