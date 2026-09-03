export {};

declare global {
  interface Window {
    gestetnerDesktop?: {
      isDesktop: boolean;
      platform: string;
      printInvoice: (html: string) => Promise<{ success: boolean }>;
    };
  }
}
