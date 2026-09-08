/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { fork } = require("node:child_process");
const { readFile, writeFile } = require("node:fs/promises");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const DEVELOPMENT_URL = process.env.ELECTRON_START_URL || "http://127.0.0.1:3000";
const PREFERRED_PORT = 3210;
let mainWindow = null;
let nextServer = null;
const MAX_PRINT_HTML_LENGTH = 2_000_000;

function printerSettingsPath() {
  return path.join(app.getPath("userData"), "printer-settings.json");
}

async function readPrinterSettings() {
  try {
    const parsed = JSON.parse(await readFile(printerSettingsPath(), "utf8"));
    return typeof parsed.receiptPrinterDeviceName === "string"
      ? { receiptPrinterDeviceName: parsed.receiptPrinterDeviceName }
      : { receiptPrinterDeviceName: "" };
  } catch {
    return { receiptPrinterDeviceName: "" };
  }
}

function isTrustedRenderer(event) {
  return !!mainWindow && !mainWindow.isDestroyed() && event.sender.id === mainWindow.webContents.id;
}

function assertTrustedRenderer(event) {
  if (!isTrustedRenderer(event)) throw new Error("The printer request did not come from the POS application.");
}

function validateDeviceName(value, allowEmpty = true) {
  if (value === undefined || value === null || (allowEmpty && value === "")) return "";
  if (typeof value !== "string" || value.length > 512 || /[\r\n\0]/.test(value)) {
    throw new Error("The selected printer name is invalid.");
  }
  return value;
}

function validatePrintRequest(value) {
  if (!value || typeof value !== "object") throw new Error("The invoice print request is invalid.");
  const html = value.html;
  const invoiceNo = value.invoiceNo;
  if (typeof html !== "string" || !html.trim() || html.length > MAX_PRINT_HTML_LENGTH) {
    throw new Error("The invoice print content is empty or too large.");
  }
  if (/<script\b|javascript:/i.test(html)) throw new Error("The invoice print content contains unsafe code.");
  if (typeof invoiceNo !== "string" || !invoiceNo.trim() || invoiceNo.length > 100 || /[\r\n\0]/.test(invoiceNo)) {
    throw new Error("The invoice number is invalid.");
  }
  return { html, invoiceNo: invoiceNo.trim(), deviceName: validateDeviceName(value.deviceName) };
}

async function availablePrinters() {
  if (!mainWindow || mainWindow.isDestroyed()) throw new Error("The POS window is not available.");
  return mainWindow.webContents.getPrintersAsync();
}

function printWebContents(contents, options) {
  return new Promise((resolve, reject) => {
    contents.print(options, (success, failureReason) => {
      if (success) resolve();
      else reject(new Error(failureReason || "Windows could not send the invoice to the printer."));
    });
  });
}

async function printInvoice(request) {
  const printers = await availablePrinters();
  const settings = await readPrinterSettings();
  const deviceName = request.deviceName || settings.receiptPrinterDeviceName;
  if (deviceName && !printers.some((printer) => printer.name === deviceName)) {
    throw new Error(`The saved receipt printer "${deviceName}" is not installed or is currently unavailable.`);
  }
  if (!deviceName && printers.length === 0) {
    throw new Error("No printers are installed on this computer.");
  }

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      javascript: false,
      webSecurity: true,
    },
  });

  try {
    printWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(request.html)}`);
    await printWebContents(printWindow.webContents, {
      silent: true,
      ...(deviceName ? { deviceName } : {}),
      printBackground: true,
      usePrinterDefaultPageSize: true,
      margins: { marginType: "none" },
    });
    return { success: true, message: `Invoice ${request.invoiceNo} was sent to ${deviceName || "the system default printer"}.` };
  } finally {
    if (!printWindow.isDestroyed()) printWindow.destroy();
  }
}

function registerPrinterIpc() {
  ipcMain.handle("printer:list", async (event) => {
    assertTrustedRenderer(event);
    const [printers, settings] = await Promise.all([availablePrinters(), readPrinterSettings()]);
    return {
      printers: printers.map(({ name, displayName, description, options }) => ({
        deviceName: name,
        displayName: displayName || name,
        description: description || "",
        isDefault: options?.["printer-is-default"] === "true" || options?.isDefault === true,
      })),
      selectedDeviceName: settings.receiptPrinterDeviceName,
    };
  });

  ipcMain.handle("printer:save", async (event, value) => {
    assertTrustedRenderer(event);
    const deviceName = validateDeviceName(value?.deviceName);
    if (deviceName) {
      const printers = await availablePrinters();
      if (!printers.some((printer) => printer.name === deviceName)) {
        throw new Error("The selected printer is no longer available. Refresh the printer list and try again.");
      }
    }
    await writeFile(printerSettingsPath(), JSON.stringify({ receiptPrinterDeviceName: deviceName }, null, 2), "utf8");
    return { success: true, message: deviceName ? "Receipt printer saved for this device." : "The system default printer will be used." };
  });

  ipcMain.handle("printer:print-invoice", async (event, value) => {
    assertTrustedRenderer(event);
    return printInvoice(validatePrintRequest(value));
  });
}

function canListen(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => tester.close(() => resolve(true)));
    tester.listen(port, "127.0.0.1");
  });
}

async function findPort() {
  for (let port = PREFERRED_PORT; port < PREFERRED_PORT + 20; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error("Could not find an available local port for the POS interface.");
}

function waitForServer(url, timeoutMs = 60000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });
      request.on("error", () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
        } else {
          setTimeout(check, 250);
        }
      });
      request.setTimeout(2000, () => request.destroy());
    };
    check();
  });
}

async function startPackagedNextServer() {
  const port = await findPort();
  const serverDirectory = path.join(process.resourcesPath, "next-server");
  const serverEntry = path.join(serverDirectory, "server.js");

  nextServer = fork(serverEntry, [], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      NODE_ENV: "production",
    },
    execPath: process.execPath,
    silent: true,
  });

  nextServer.stdout?.on("data", (chunk) => console.log(`[next] ${chunk}`));
  nextServer.stderr?.on("data", (chunk) => console.error(`[next] ${chunk}`));
  nextServer.once("exit", (code) => {
    if (!app.isQuitting && code !== 0) {
      dialog.showErrorBox("Gestetner POS", "The application server stopped unexpectedly. Please restart Gestetner POS.");
    }
  });

  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

function createWindow(appUrl) {
  mainWindow = new BrowserWindow({
    title: "Gestetner POS",
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  const allowedOrigin = new URL(appUrl).origin;
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== allowedOrigin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.loadURL(appUrl);
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) app.quit();

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  try {
    registerPrinterIpc();
    const appUrl = app.isPackaged ? await startPackagedNextServer() : DEVELOPMENT_URL;
    if (!app.isPackaged) await waitForServer(appUrl);
    createWindow(appUrl);
  } catch (error) {
    dialog.showErrorBox("Gestetner POS could not start", error instanceof Error ? error.message : String(error));
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && mainWindow) mainWindow.show();
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (nextServer && !nextServer.killed) nextServer.kill();
});

app.on("window-all-closed", () => app.quit());
