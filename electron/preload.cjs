/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge } = require("electron");

// Deliberately exposes no Node.js, filesystem, shell, or arbitrary IPC access.
contextBridge.exposeInMainWorld("gestetnerDesktop", Object.freeze({
  isDesktop: true,
  platform: process.platform,
}));
