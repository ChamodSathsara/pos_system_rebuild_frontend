import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const standaloneDirectory = path.join(projectRoot, ".next", "standalone");

async function requireDirectory(directory, label) {
  try {
    if (!(await stat(directory)).isDirectory()) throw new Error();
  } catch {
    throw new Error(`${label} was not found. Run \"npm run build\" first.`);
  }
}

await requireDirectory(standaloneDirectory, "Next.js standalone output");
await mkdir(path.join(standaloneDirectory, ".next"), { recursive: true });
await cp(path.join(projectRoot, ".next", "static"), path.join(standaloneDirectory, ".next", "static"), { recursive: true, force: true });
await cp(path.join(projectRoot, "public"), path.join(standaloneDirectory, "public"), { recursive: true, force: true });

console.log("Prepared Next.js standalone runtime for Electron packaging.");
