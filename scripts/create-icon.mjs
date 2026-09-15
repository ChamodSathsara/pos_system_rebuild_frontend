import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// An ICO file can contain a PNG directly. Creating it here prevents
// electron-builder's WASM icon converter from exhausting memory on Windows.
const root = process.cwd();
const png = await readFile(path.join(root, "build", "icon.png"));
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // ICO type
header.writeUInt16LE(1, 4); // one image
header.writeUInt8(0, 6); // 0 represents 256px
header.writeUInt8(0, 7); // 0 represents 256px
header.writeUInt8(0, 8);
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);

await writeFile(path.join(root, "build", "icon.ico"), Buffer.concat([header, png]));
