"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Barcode, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCustomers } from "@/hooks/use-party";
import { printReceipt } from "@/lib/receipt-print";
import type { Customer } from "@/types";
import { toast } from "sonner";

const CODE_39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn", "A": "wnnnnwnnw", "B": "nnwnnwnnw", "C": "wnwnnwnnn", "D": "nnnnwwnnw", "E": "wnnnwwnnn", "F": "nnwnwwnnn", "G": "nnnnnwwnw", "H": "wnnnnwwnn", "I": "nnwnnwwnn", "J": "nnnnwwwnn", "K": "wnnnnnnww", "L": "nnwnnnnww", "M": "wnwnnnnwn", "N": "nnnnwnnww", "O": "wnnnwnnwn", "P": "nnwnwnnwn", "Q": "nnnnnnwww", "R": "wnnnnnwwn", "S": "nnwnnnwwn", "T": "nnnnwnwwn", "U": "wwnnnnnnw", "V": "nwwnnnnnw", "W": "wwwnnnnnn", "X": "nwnnwnnnw", "Y": "wwnnwnnnn", "Z": "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "$": "nwnwnwnnn", "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn", "*": "nwnnwnwnn",
};

function barcodeText(customerCode: string) {
  return customerCode.toUpperCase().split("").filter((character) => CODE_39[character]).join("");
}
function barcodeBars(customerCode: string) {
  const encoded = `*${barcodeText(customerCode)}*`;
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  for (const character of encoded) {
    CODE_39[character].split("").forEach((kind, index) => {
      const width = kind === "w" ? 3 : 1;
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    });
    x += 1;
  }
  return { bars, width: x };
}
function CustomerBarcode({ customerCode }: { customerCode: string }) {
  const { bars, width } = barcodeBars(customerCode);
  return <svg viewBox={`0 0 ${width} 64`} role="img" aria-label={`Barcode for ${customerCode}`} className="h-28 w-full bg-white"><rect width={width} height="64" fill="white" />{bars.map((bar, index) => <rect key={index} x={bar.x} y="0" width={bar.width} height="52" fill="black" />)}<text x={width / 2} y="62" textAnchor="middle" fontSize="8" fill="black">{customerCode}</text></svg>;
}
function barcodePrintHtml(customer: Customer) {
  const { bars, width } = barcodeBars(customer.customerCode);
  const lines = bars.map((bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="52" fill="black"/>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${customer.customerCode}</title><style>@page{margin:0}body{width:78mm;margin:0;padding:8mm;font-family:Arial;text-align:center}h1{font-size:16px;margin:0 0 4px}p{font-size:12px;margin:0 0 10px}svg{width:100%;height:auto}</style></head><body><h1>${customer.customerName}</h1><p>Customer Code: ${customer.customerCode}</p><svg viewBox="0 0 ${width} 64" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="64" fill="white"/>${lines}<text x="${width / 2}" y="62" text-anchor="middle" font-size="8" fill="black">${customer.customerCode}</text></svg></body></html>`;
}

export default function CustomersPage() {
  const { data, isLoading, isError, refetch } = useCustomers();
  const [selected, setSelected] = useState<Customer | null>(null);
  const [printing, setPrinting] = useState(false);
  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    { accessorKey: "customerCode", header: "Customer Code" },
    { accessorKey: "customerName", header: "Customer Name", cell: ({ row }) => <span className="font-medium">{row.original.customerName}</span> },
    { accessorKey: "mobile", header: "Mobile", cell: ({ row }) => row.original.mobile || "—" },
    { accessorKey: "customerType", header: "Type" },
    { accessorKey: "isActive", header: "Status", cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "secondary"}>{row.original.isActive ? "Active" : "Inactive"}</Badge> },
    { id: "barcode", header: "", cell: ({ row }) => <Button type="button" size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setSelected(row.original); }}><Barcode className="h-4 w-4" /> Generate Barcode</Button> },
  ], []);
  const print = async () => {
    if (!selected) return;
    setPrinting(true);
    try { await printReceipt(barcodePrintHtml(selected), `CUSTOMER-${selected.customerCode}`); toast.success("Customer barcode sent to the printer."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Customer barcode could not be printed."); }
    finally { setPrinting(false); }
  };
  return <div className="space-y-6"><PageHeader title="Customers" description="View customer records and print a barcode for each customer code." /><DataTable columns={columns} data={data ?? []} isLoading={isLoading} error={isError ? "Failed to load customers." : null} onRetry={refetch} searchPlaceholder="Search customer code, name, or mobile..." emptyTitle="No customers found" onRowClick={setSelected} /><Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><DialogContent><DialogHeader><DialogTitle>Customer Barcode</DialogTitle></DialogHeader>{selected && <div className="space-y-4"><div><p className="font-semibold">{selected.customerName}</p><p className="text-sm text-muted-foreground">{selected.customerCode}</p></div><div className="rounded-lg border bg-white p-4"><CustomerBarcode customerCode={selected.customerCode} /></div><p className="text-xs text-muted-foreground">Barcode value: {barcodeText(selected.customerCode)}</p></div>}<DialogFooter><Button type="button" onClick={() => void print()} disabled={printing}>{printing ? "Printing..." : <><Printer className="h-4 w-4" /> Print Barcode</>}</Button></DialogFooter></DialogContent></Dialog></div>;
}
