import { PaymentMethod, PaymentStatus, SaleStatus } from "./enums";

export interface SaleItem {
  id: number;
  invoiceNo?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  discountAmount?: number | null;
  taxAmount?: number | null;
  totalPrice?: number | null;
}

export interface Sale {
  invoiceNo: string;
  branchCode?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  saleDate?: string | null;
  subtotal?: number | null;
  discountAmount?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
  balanceAmount?: number | null;
  status: SaleStatus;
  createdBy?: string | null;
  createdAt?: string | null;
  items: SaleItem[];
}

export interface CreateSaleItemLine {
  itemCode: string;
  quantity: number;
  unitPrice?: number | null;
  discountAmount?: number | null;
}

export interface CreateSalePaymentLine {
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNo?: string | null;
}

export interface CreateSaleRequest {
  invoiceNo?: string | null;
  branchCode: string;
  customerCode?: string | null;
  saleDate?: string | null;
  discountAmount?: number | null;
  items: CreateSaleItemLine[];
  payments: CreateSalePaymentLine[];
}

export interface SaleInvoiceItem {
  itemCode?: string | null;
  itemName?: string | null;
  quantity: number;
  price: number;
  lp: number;
  amount: number;
}

export interface SaleInvoicePayment {
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNo?: string | null;
}

export interface SaleInvoice {
  invoiceNo: string;
  saleDate?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  branchCode?: string | null;
  branchName?: string | null;
  branchAddress?: string | null;
  branchPhone?: string | null;
  cashierCode?: string | null;
  cashierName?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  items: SaleInvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  payments: SaleInvoicePayment[];
}

export interface SaleReturnItem {
  id: number;
  returnNo?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  totalAmount?: number | null;
}

export interface SaleReturn {
  returnNo: string;
  invoiceNo?: string | null;
  returnDate?: string | null;
  reason?: string | null;
  totalReturnAmount?: number | null;
  createdBy?: string | null;
  items: SaleReturnItem[];
}

export interface CreateSaleReturnItemLine {
  itemCode: string;
  quantity: number;
}

export interface CreateSaleReturnRequest {
  returnNo?: string | null;
  invoiceNo: string;
  returnDate?: string | null;
  reason?: string | null;
  items: CreateSaleReturnItemLine[];
}

export interface Payment {
  paymentId: number;
  invoiceNo?: string | null;
  paymentMethod: PaymentMethod;
  amount?: number | null;
  paymentDate?: string | null;
  referenceNo?: string | null;
  status: PaymentStatus;
  receivedBy?: string | null;
}

export interface CreatePaymentRequest {
  invoiceNo: string;
  paymentMethod: PaymentMethod;
  amount: number;
  paymentDate?: string | null;
  referenceNo?: string | null;
}

export interface CancelPaymentRequest {
  remarks?: string | null;
}
