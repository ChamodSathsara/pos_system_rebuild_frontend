import { salesApi } from "@/lib/api";
import { buildInvoiceReceiptHtml } from "@/lib/invoice-receipt";
import { printReceipt } from "@/lib/receipt-print";

interface PaymentSummary {
  tendered: number;
  change: number;
}

export async function printSaleInvoice(invoiceNo: string, paymentSummary?: PaymentSummary) {
  const invoice = await salesApi.invoice(invoiceNo);
  const paymentTotal = invoice.payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const tendered = paymentSummary?.tendered ?? (paymentTotal > 0 ? paymentTotal : Number(invoice.paidAmount || 0));
  const change = paymentSummary?.change ?? Math.max(0, tendered - Number(invoice.totalAmount || 0));
  const html = buildInvoiceReceiptHtml(invoice, tendered, change);

  await printReceipt(html, invoiceNo);
}
