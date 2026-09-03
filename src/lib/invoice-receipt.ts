import type { SaleInvoice } from "@/types";

const amount = (value: number | null | undefined) =>
  Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const escapeHtml = (value: string | null | undefined) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatInvoiceDate = (value: string | null | undefined) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export function buildInvoiceReceiptHtml(invoice: SaleInvoice, tendered: number, change: number) {
  const items = invoice.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.itemName || item.itemCode)}</td>
      <td class="right">${amount(item.quantity).replace(".00", "")}</td>
      <td class="right">${amount(item.price)}</td>
    </tr>`).join("");

  const payments = invoice.payments.length > 1
    ? invoice.payments.map((payment) => `<div class="row"><span>${escapeHtml(payment.paymentMethod).toUpperCase()}</span><span>${amount(payment.amount)}</span></div>`).join("")
    : `<div class="row"><span>${escapeHtml(invoice.payments[0]?.paymentMethod || "Cash").toUpperCase()}</span><span>${amount(tendered)}</span></div>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(invoice.invoiceNo)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { width: 80mm; margin: 0; padding: 0; background: white; color: black; }
  body { font-family: "Courier New", Consolas, monospace; font-size: 11.5px; font-weight: 700; line-height: 1.3; }
  .receipt { width: 76mm; padding: 3mm 3mm 5mm 2mm; }
  .center { text-align: center; }
  .company { font-size: 16px; font-weight: 900; line-height: 1.15; }
  .address { margin-top: 2px; font-size: 11.5px; font-weight: 700; }
  .rule { margin: 6px 0; border-top: 1px dashed black; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .row span:last-child { min-width: 0; text-align: right; }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; }
  th { padding: 0 1px 3px; border-bottom: 1px solid black; text-align: left; font-weight: 900; }
  td { padding: 3px 1px; vertical-align: top; overflow-wrap: anywhere; font-weight: 700; }
  th:nth-child(1), td:nth-child(1) { width: 52%; }
  th:nth-child(2), td:nth-child(2) { width: 13%; }
  th:nth-child(3), td:nth-child(3) { width: 35%; }
  .right { text-align: right; white-space: nowrap; }
  .total { margin: 3px 0; padding: 2px 0; border-top: 1px solid black; border-bottom: 1px solid black; font-size: 17px; font-weight: 900; }
  .thanks { margin-top: 8px; font-size: 12px; line-height: 1.4; }
</style></head><body><main class="receipt">
  <header class="center">
    <div class="company">${escapeHtml(invoice.companyName || "GESTETNER OF CEYLON PLC").toUpperCase()}</div>
    <div class="address">${escapeHtml(invoice.companyAddress || invoice.branchAddress)}</div>
    ${invoice.companyPhone || invoice.branchPhone ? `<div>Tel: ${escapeHtml(invoice.companyPhone || invoice.branchPhone)}</div>` : ""}
  </header>
  <div class="rule"></div>
  <section>
    <div class="row"><span>INVOICE NO</span><span>${escapeHtml(invoice.invoiceNo)}</span></div>
    <div class="row"><span>DATE</span><span>${formatInvoiceDate(invoice.saleDate)}</span></div>
    <div class="row"><span>BRANCH</span><span>${escapeHtml(invoice.branchName || invoice.branchCode)}</span></div>
    <div class="row"><span>CASHIER</span><span>${escapeHtml(invoice.cashierName || invoice.cashierCode)}</span></div>
  </section>
  <div class="rule"></div>
  <table><thead><tr><th>ITEM</th><th class="right">QTY</th><th class="right">PRICE</th></tr></thead><tbody>${items}</tbody></table>
  <div class="rule"></div>
  <div class="row"><span>SUB TOTAL</span><span>${amount(invoice.subtotal)}</span></div>
  ${invoice.discountAmount > 0 ? `<div class="row"><span>DISCOUNT</span><span>-${amount(invoice.discountAmount)}</span></div>` : ""}
  ${invoice.taxAmount > 0 ? `<div class="row"><span>TAX</span><span>${amount(invoice.taxAmount)}</span></div>` : ""}
  <div class="row total"><span>TOTAL</span><span>${amount(invoice.totalAmount)}</span></div>
  ${payments}
  <div class="row"><span>BALANCE</span><span>${amount(change)}</span></div>
  <div class="rule"></div>
  <div>Customer : ${escapeHtml(invoice.customerName || "Walk-in Customer")}</div>
  <div class="rule"></div>
  <footer class="center thanks">★ Thank You! ★<br>Please Come Again</footer>
</main></body></html>`;
}
