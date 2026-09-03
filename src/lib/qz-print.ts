import qz from "qz-tray";

const RECEIPT_PRINTER = "GA-E200 Series";
let securityConfigured = false;
let connectionPromise: Promise<void> | null = null;

function configureSecurity() {
  if (securityConfigured) return;
  qz.security.setCertificatePromise(async () => {
    const response = await fetch("/api/qz/certificate", { cache: "no-store" });
    if (!response.ok) throw new Error(await response.text());
    return response.text();
  });
  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise(async (request) => {
    const response = await fetch("/api/qz/sign", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: request,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.text();
  });
  securityConfigured = true;
}

async function connect() {
  configureSecurity();
  if (qz.websocket.isActive()) return;
  if (!connectionPromise) {
    connectionPromise = qz.websocket.connect({ retries: 3, delay: 1 }).finally(() => {
      connectionPromise = null;
    });
  }
  await connectionPromise;
}

export async function printReceiptWithQz(html: string, invoiceNo: string) {
  await connect();
  const printer = await qz.printers.find(RECEIPT_PRINTER);
  if (!printer || printer.toLowerCase() !== RECEIPT_PRINTER.toLowerCase()) {
    throw new Error(`Printer "${RECEIPT_PRINTER}" was not found.`);
  }
  const config = qz.configs.create(printer, {
    copies: 1,
    margins: 0,
    orientation: "portrait",
    units: "mm",
    size: { width: 80 },
    scaleContent: false,
    jobName: `Invoice ${invoiceNo}`,
  });
  await qz.print(config, [{ type: "pixel", format: "html", flavor: "plain", data: html }]);
}
