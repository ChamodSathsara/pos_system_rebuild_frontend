"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

export function ProductSelector({ products, value, onChange, isLoading = false }: { products: Product[]; value: string; onChange: (itemCode: string) => void; isLoading?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = products.find((product) => product.itemCode === value);
  const query = search.trim().toLowerCase();
  const filtered = query ? products.filter((product) => product.itemCode.toLowerCase().includes(query) || product.itemName.toLowerCase().includes(query)) : products;

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="h-auto min-h-9 w-full justify-between px-3 py-2 font-normal" disabled={isLoading}>
          {selected ? <span className="min-w-0 text-left"><span className="block truncate">{selected.itemName}</span><span className="block truncate text-xs text-muted-foreground">{selected.itemCode}</span></span> : <span className="text-muted-foreground">{isLoading ? "Loading items..." : "Select an item"}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <div className="flex items-center border-b border-border px-3"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by item name or code..." className="border-0 shadow-none focus-visible:ring-0" autoFocus /></div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching items found.</p> : filtered.map((product) => (
            <button key={product.itemCode} type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none" onClick={() => { onChange(product.itemCode); setOpen(false); setSearch(""); }}>
              <Check className={cn("h-4 w-4 shrink-0", value === product.itemCode ? "opacity-100" : "opacity-0")} />
              <span className="min-w-0"><span className="block truncate font-medium">{product.itemName}</span><span className="block truncate text-xs text-muted-foreground">{product.itemCode}</span></span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
