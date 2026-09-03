/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { fork } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const DEVELOPMENT_URL = process.env.ELECTRON_START_URL || "http://127.0.0.1:3000";
const PREFERRED_PORT = 3210;
let mainWindow = null;
let nextServer = null;

ipcMain.handle("invoice:print", async (event, html) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error("Invoice print request was rejected.");
  if (typeof html !== "string" || html.length === 0 || html.length > 5_000_000) throw new Error("Invalid invoice content.");

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const printers = await printWindow.webContents.getPrintersAsync();
    const receiptPrinter = printers.find((printer) => printer.name.toLowerCase() === "ga-e200 series".toLowerCase());
    if (!receiptPrinter) throw new Error('Printer "GA-E200 Series" was not found.');

    await new Promise((resolve, reject) => {
      printWindow.webContents.print({
        silent: true,
        deviceName: receiptPrinter.name,
        printBackground: true,
        landscape: false,
        margins: { marginType: "none" },
      }, (success, reason) => {
        if (success) resolve();
        else reject(new Error(reason || "Printing failed."));
      });
    });
    return { success: true };
  } finally {
    if (!printWindow.isDestroyed()) printWindow.close();
  }
});

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
