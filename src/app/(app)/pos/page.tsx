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
import { useProducts } from "@/hooks/use-catalog";
import { useCreateSale, useSaleInvoice } from "@/hooks/use-sale";
import { useCustomer, useCreateCustomer } from "@/hooks/use-party";
import { useEvaluateDiscount } from "@/hooks/use-misc";
import { useAuthStore } from "@/store/auth-store";
import { isBranchScoped } from "@/lib/permissions";
import { useBranches } from "@/hooks/use-organization";
import { formatMoney } from "@/lib/format";
import { PaymentMethod, type Product } from "@/types";
import { toast } from "sonner";

interface CartLine {
  itemCode: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxPercentage: number;
}

interface PaymentLine {
  id: string;
  paymentMethod: PaymentMethod;
  amount: string;
}

export default function PosTerminalPage() {
  const user = useAuthStore((s) => s.user);
  const scoped = isBranchScoped(user?.roleName);
  const { data: branches } = useBranches();
  const [branchCode, setBranchCode] = useState<string>(user?.branchCode ?? "");

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerCode, setCustomerCode] = useState("");
  const [billDiscount, setBillDiscount] = useState(0);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: results } = useProducts(query.length >= 2 ? { keyword: query, isActive: true } : undefined);
  const { data: customer } = useCustomer(customerCode || undefined);
  const evaluateM = useEvaluateDiscount();
  const createSale = useCreateSale();

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.itemCode === p.itemCode);
      if (existing) {
        return prev.map((l) => (l.itemCode === p.itemCode ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          itemCode: p.itemCode,
          itemName: p.itemName,
          unitPrice: p.sellingPrice ?? 0,
          quantity: 1,
          discountAmount: 0,
          taxPercentage: p.taxPercentage ?? 0,
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
    setCart((prev) => prev.map((l) => (l.itemCode === itemCode ? { ...l, quantity: qty } : l)));
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
      setBillDiscount(0);
      return;
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

  const payExactCash = () => setPayments([{ id: crypto.randomUUID(), paymentMethod: "Cash", amount: total.toFixed(2) }]);

  const resetCart = () => {
    setCart([]);
    setCustomerCode("");
    setPayments([]);
    setBillDiscount(0);
  };

  const checkout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }
    if (!branchCode) {
      toast.error("Select a branch first.");
      return;
    }
    if (payments.length > 0 && paidTotal > total + 0.01) {
      toast.error("Total payments exceed the bill total.");
      return;
    }
    createSale.mutate(
      {
        invoiceNo: null,
        branchCode,
        customerCode: customerCode || null,
        discountAmount: billDiscount || null,
        items: cart.map((l) => ({ itemCode: l.itemCode, quantity: l.quantity, unitPrice: l.unitPrice, discountAmount: l.discountAmount || null })),
        payments: payments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({ paymentMethod: p.paymentMethod, amount: Number(p.amount) })),
      },
      {
        onSuccess: (sale) => {
          toast.success(`Sale ${sale.invoiceNo} completed`);
          setLastInvoice(sale.invoiceNo);
          resetCart();
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
          {!scoped && (
            <Select value={branchCode} onValueChange={setBranchCode}>
              <SelectTrigger className="w-40 h-11"><SelectValue placeholder="Branch" /></SelectTrigger>
              <SelectContent>
                {branches?.map((b) => <SelectItem key={b.branchCode} value={b.branchCode}>{b.branchName}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {scoped && <Badge variant="outline" className="h-11 px-3">{branchCode}</Badge>}
        </div>

        <ScrollArea className="flex-1 rounded-xl border border-border bg-card p-3">
          {query.length < 2 ? (
            <EmptyState icon={Search} title="Start typing to search" description="Search by product name, or scan a barcode and press Enter." />
          ) : !results || results.length === 0 ? (
            <EmptyState title="No products found" description={`No matches for "${query}"`} />
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
                  <p className="num mt-1 text-sm font-semibold text-primary">{formatMoney(p.sellingPrice)}</p>
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
                <Input
                  type="number"
                  step="0.01"
                  value={billDiscount}
                  onChange={(e) => setBillDiscount(Number(e.target.value) || 0)}
                  className="h-7 w-24 text-right num"
                />
              </div>
              <div className="flex justify-between text-muted-foreground"><span>Est. Tax</span><span className="num">{formatMoney(estTax)}</span></div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold text-foreground"><span>Total</span><span className="num">{formatMoney(total)}</span></div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Payments</Label>
                <div className="flex gap-1">
                  <Button size="xs" variant="secondary" onClick={payExactCash}><Banknote className="h-3.5 w-3.5" /> Full Cash</Button>
                  <Button size="xs" variant="outline" onClick={() => addPayment()}><Plus className="h-3.5 w-3.5" /> Add</Button>
                </div>
              </div>
              {payments.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <Select value={p.paymentMethod} onValueChange={(v) => updatePayment(p.id, { paymentMethod: v as PaymentMethod })}>
                    <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PaymentMethod.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" step="0.01" className="h-8 w-24 num" value={p.amount} onChange={(e) => updatePayment(p.id, { amount: e.target.value })} />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removePayment(p.id)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              {payments.length > 0 && (
                <div className={`flex justify-between text-xs font-medium ${balance > 0.01 ? "text-warning" : balance < -0.01 ? "text-destructive" : "text-success"}`}>
                  <span>{balance > 0.01 ? "Balance Due" : balance < -0.01 ? "Change" : "Fully Paid"}</span>
                  <span className="num">{formatMoney(Math.abs(balance))}</span>
                </div>
              )}
            </div>

            <Button className="h-11 w-full text-base" disabled={cart.length === 0 || createSale.isPending} onClick={checkout}>
              {createSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptIcon className="h-4 w-4" />}
              Complete Sale — {formatMoney(total)}
            </Button>
          </div>
        </Card>
      </div>

      <NewCustomerDialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen} onCreated={(code) => setCustomerCode(code)} />
      <ReceiptDialog invoiceNo={lastInvoice} onClose={() => setLastInvoice(null)} />
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

function ReceiptDialog({ invoiceNo, onClose }: { invoiceNo: string | null; onClose: () => void }) {
  const { data: invoice, isLoading } = useSaleInvoice(invoiceNo ?? undefined);

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
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
