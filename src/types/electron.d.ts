export {};

export interface ElectronPrinter {
  deviceName: string;
  displayName: string;
  description: string;
  isDefault: boolean;
}

export interface ElectronPrinterList {
  printers: ElectronPrinter[];
  selectedDeviceName: string;
}

export interface ElectronPrintResult {
  success: boolean;
  message: string;
}

declare global {
  interface Window {
    electronAPI?: {
      readonly isElectron: true;
      listPrinters: () => Promise<ElectronPrinterList>;
      saveReceiptPrinter: (deviceName: string) => Promise<ElectronPrintResult>;
      printInvoice: (request: { html: string; invoiceNo: string; deviceName?: string }) => Promise<ElectronPrintResult>;
    };
    gestetnerDesktop?: {
      readonly isDesktop: true;
      readonly platform: string;
    };
  }
}
