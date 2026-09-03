export {};

declare global {
  interface Window {
    gestetnerDesktop?: {
      isDesktop: boolean;
      platform: string;
    };
  }
}
