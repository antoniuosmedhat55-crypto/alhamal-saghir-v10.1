import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(root, ".workbench");
const targets = [
  { dir: path.join(root, "public", "html-chunks"), file: "app.html" },
  { dir: path.join(root, "bundle-chunks"), file: "server-bundle.js" },
];

function readParts(dir) {
  if (!fs.existsSync(dir)) throw new Error(`Missing chunk directory: ${path.relative(root, dir)}`);
  const parts = fs.readdirSync(dir)
    .filter((name) => /^\d+\.txt$/.test(name))
    .sort((a, b) => Number(a.slice(0, -4)) - Number(b.slice(0, -4)));
  if (!parts.length) throw new Error(`No numbered .txt chunks found in ${path.relative(root, dir)}`);
  const encoded = parts.map((name) => fs.readFileSync(path.join(dir, name), "utf8").trim()).join("");
  if (!encoded || !/^[A-Za-z0-9+/=]+$/.test(encoded)) {
    throw new Error(`Chunk data is not valid base64 in ${path.relative(root, dir)}`);
  }
  return { encoded, count: parts.length };
}

fs.mkdirSync(output, { recursive: true });
for (const target of targets) {
  const { encoded, count } = readParts(target.dir);
  let decoded;
  try {
    decoded = zlib.brotliDecompressSync(Buffer.from(encoded, "base64"));
  } catch (error) {
    throw new Error(`Could not decompress ${path.relative(root, target.dir)}: ${error.message}`);
  }
  if (!decoded.length) throw new Error(`Decoded source is empty: ${target.file}`);
  const destination = path.join(output, target.file);
  fs.writeFileSync(destination, decoded);
  console.log(`Extracted ${path.relative(root, target.dir)} (${count} chunks, ${decoded.length} bytes) -> ${path.relative(root, destination)}`);
}
console.log("Extraction complete. Edit only after reviewing source and tests; original chunk files were not changed.");
