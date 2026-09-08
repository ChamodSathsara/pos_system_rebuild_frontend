import { cp, mkdtemp, rename, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const installedElectron = path.join(projectRoot, "node_modules", "electron", "dist");
const packagedElectron = path.join(projectRoot, "release", "win-unpacked");
const packagedExecutable = path.join(packagedElectron, "Gestetner POS.exe");
const builderCli = path.join(projectRoot, "node_modules", "electron-builder", "cli.js");

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function runBuilder(electronDist) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [builderCli, "--win", "nsis", `--config.electronDist=${electronDist}`],
      { cwd: projectRoot, stdio: "inherit", windowsHide: true },
    );
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`electron-builder exited with code ${code ?? "unknown"}.`));
    });
  });
}

let temporaryRuntime;
try {
  if (await exists(path.join(installedElectron, "electron.exe"))) {
    await runBuilder(installedElectron);
  } else if (await exists(packagedExecutable)) {
    temporaryRuntime = await mkdtemp(path.join(os.tmpdir(), "gestetner-electron-runtime-"));
    await cp(packagedElectron, temporaryRuntime, { recursive: true });
    await rename(path.join(temporaryRuntime, "Gestetner POS.exe"), path.join(temporaryRuntime, "electron.exe"));
    console.log("Electron download unavailable; using the existing local Electron runtime.");
    await runBuilder(temporaryRuntime);
  } else {
    throw new Error(
      "No local Electron runtime is available. Run Electron's installer on a network that trusts the download certificate, then retry.",
    );
  }
} finally {
  if (temporaryRuntime) await rm(temporaryRuntime, { recursive: true, force: true });
}
