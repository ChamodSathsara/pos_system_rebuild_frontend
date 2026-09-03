declare module "qz-tray" {
  interface QzConfig {
    copies?: number;
    margins?: number;
    orientation?: "portrait" | "landscape";
    units?: "mm" | "in";
    size?: { width: number; height?: number };
    scaleContent?: boolean;
    jobName?: string;
  }

  interface QzApi {
    websocket: {
      isActive(): boolean;
      connect(options?: { retries?: number; delay?: number }): Promise<void>;
    };
    security: {
      setCertificatePromise(provider: () => Promise<string>): void;
      setSignatureAlgorithm(algorithm: "SHA512"): void;
      setSignaturePromise(provider: (request: string) => Promise<string>): void;
    };
    printers: { find(query: string): Promise<string> };
    configs: { create(printer: string, options?: QzConfig): unknown };
    print(config: unknown, data: unknown[]): Promise<void>;
  }

  const qz: QzApi;
  export default qz;
}
