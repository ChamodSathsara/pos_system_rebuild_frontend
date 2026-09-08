"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Printer, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUserFacingError } from "@/lib/errors";
import type { ElectronPrinter } from "@/types/electron";

const SYSTEM_DEFAULT = "__system_default__";

function testReceiptHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: 80mm auto; margin: 0; }
    html,body { width: 80mm; margin: 0; background: #fff; color: #000; }
    body { font-family: "Courier New", monospace; font-size: 12px; font-weight: 700; }
    main { width: 72mm; padding: 4mm; text-align: center; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .rule { border-top: 1px dashed #000; margin: 8px 0; }
  </style></head><body><main><h1>GESTETNER POS</h1><div class="rule"></div>
  <p>Receipt printer test</p><p>${new Date().toLocaleString("en-LK")}</p>
  <div class="rule"></div><p>Printer setup is working.</p></main></body></html>`;
}

export default function PrinterSettingsPage() {
  const [printers, setPrinters] = useState<ElectronPrinter[]>([]);
  const [selected, setSelected] = useState(SYSTEM_DEFAULT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const isElectron = typeof window !== "undefined" && !!window.electronAPI?.isElectron;

  const loadPrinters = useCallback(async () => {
    if (!window.electronAPI) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await window.electronAPI.listPrinters();
      setPrinters(result.printers);
      setSelected(result.selectedDeviceName || SYSTEM_DEFAULT);
    } catch (error) {
      const friendly = getUserFacingError(error, {
        title: "Printers could not be loaded",
        description: "Check that Windows can see the receipt printer, then try again.",
      });
      toast.error(friendly.title, { description: friendly.description });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPrinters(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPrinters]);

  const save = async () => {
    if (!window.electronAPI || isSaving) return;
    setIsSaving(true);
    try {
      const result = await window.electronAPI.saveReceiptPrinter(selected === SYSTEM_DEFAULT ? "" : selected);
      toast.success("Receipt printer saved", { description: result.message });
    } catch (error) {
      const friendly = getUserFacingError(error, {
        title: "Printer setting could not be saved",
        description: "Refresh the printer list, select an available printer, and try again.",
      });
      toast.error(friendly.title, { description: friendly.description });
    } finally {
      setIsSaving(false);
    }
  };

  const test = async () => {
    if (!window.electronAPI || isTesting) return;
    setIsTesting(true);
    try {
      const result = await window.electronAPI.printInvoice({
        html: testReceiptHtml(),
        invoiceNo: "PRINTER-TEST",
        ...(selected === SYSTEM_DEFAULT ? {} : { deviceName: selected }),
      });
      toast.success("Test receipt sent", { description: result.message });
    } catch (error) {
      const friendly = getUserFacingError(error, {
        title: "The test receipt could not be printed",
        description: "Check the printer connection, paper and Windows printer status, then try again.",
      });
      toast.error(friendly.title, { description: friendly.description });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Receipt Printer" description="Choose the printer used for silent invoice printing on this device." />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Printer settings</CardTitle>
          <CardDescription>
            {isElectron
              ? "This setting is stored only on this POS computer."
              : "Printer selection and silent printing are available only in the Electron desktop application."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="receipt-printer">Receipt printer</Label>
            <Select value={selected} onValueChange={setSelected} disabled={!isElectron || isLoading}>
              <SelectTrigger id="receipt-printer">
                <SelectValue placeholder={isLoading ? "Loading printers…" : "Select a printer"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SYSTEM_DEFAULT}>System default printer</SelectItem>
                {printers.map((printer) => (
                  <SelectItem key={printer.deviceName} value={printer.deviceName}>
                    {printer.displayName}{printer.isDefault ? " (Windows default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isElectron && !isLoading && printers.length === 0 && (
              <p className="text-sm text-destructive">No printers were found. Install the printer in Windows and refresh the list.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadPrinters} disabled={!isElectron || isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh printers
            </Button>
            <Button variant="outline" onClick={test} disabled={!isElectron || isTesting || isLoading || printers.length === 0}>
              {isTesting ? <Loader2 className="animate-spin" /> : <Printer />} Test print
            </Button>
            <Button onClick={save} disabled={!isElectron || isSaving || isLoading || printers.length === 0}>
              {isSaving ? <Loader2 className="animate-spin" /> : <Save />} Save printer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
