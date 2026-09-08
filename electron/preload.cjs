/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

// Deliberately exposes no Node.js, filesystem, shell, or arbitrary IPC access.
contextBridge.exposeInMainWorld("gestetnerDesktop", Object.freeze({
  isDesktop: true,
  platform: process.platform,
}));

contextBridge.exposeInMainWorld("electronAPI", Object.freeze({
  isElectron: true,
  listPrinters: () => ipcRenderer.invoke("printer:list"),
  saveReceiptPrinter: (deviceName) => ipcRenderer.invoke("printer:save", { deviceName }),
  printInvoice: (request) => ipcRenderer.invoke("printer:print-invoice", request),
}));
