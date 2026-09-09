import { api, cleanParams, httpClient } from "./client";
import type { AcceptStockTransferRequest, BranchAcceptTransferRequest, CreateStockTransferRequest, DispatchStockTransferRequest, ReceiveTransferRequest, StockTransfer, StockTransferStatus, TransferDispatch, TransferReceipt } from "@/types";

export interface StockTransferFilters { sourceWarehouseCode?: string; destinationWarehouseCode?: string; status?: StockTransferStatus; fromDate?: string; toDate?: string; }
async function download(url: string, filename: string) {
  const response = await httpClient.get<Blob>(url, { responseType: "blob" });
  const href = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = href; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}
export const stockTransfersApi = {
  list: (filters?: StockTransferFilters) => api.get<StockTransfer[]>("/api/stock-transfers", { params: cleanParams({ ...filters }) }),
  get: (id: number) => api.get<StockTransfer>(`/api/stock-transfers/${id}`),
  create: (body: CreateStockTransferRequest) => api.post<StockTransfer>("/api/stock-transfers", body),
  accept: (id: number, body: AcceptStockTransferRequest) => api.post<StockTransfer>(`/api/stock-transfers/${id}/accept`, body),
  dispatch: (id: number, body: DispatchStockTransferRequest) => api.post<TransferDispatch>(`/api/stock-transfers/${id}/dispatch`, body),
  branchAccept: (id: number, body: BranchAcceptTransferRequest) => api.post<StockTransfer>(`/api/stock-transfers/${id}/branch-accept`, body),
  receive: (id: number, body: ReceiveTransferRequest) => api.post<TransferReceipt>(`/api/stock-transfers/dispatches/${id}/receive`, body),
  deliveryNote: (id: number, no: string) => download(`/api/stock-transfers/dispatches/${id}/delivery-note.pdf`, `${no}.pdf`),
  receipt: (id: number, no: string) => download(`/api/stock-transfers/receipts/${id}/receipt.pdf`, `${no}.pdf`),
};
