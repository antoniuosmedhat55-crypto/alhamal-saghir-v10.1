import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bundlePath = path.join(root, ".workbench", "server-bundle.js");
if (!fs.existsSync(bundlePath)) throw new Error("Run npm run source:extract before this audit.");
const source = fs.readFileSync(bundlePath, "utf8");
const routes = new Map();
const patterns = [
  /if\(req\.method===['"]([A-Z]+)['"]&&u\.pathname===['"]([^'"]+)['"]\)/g,
  /if\(req\.method===['"]([A-Z]+)['"]&&u\.pathname\.startsWith\(['"]([^'"]+)['"]\)\)/g,
  /if\(req\.method===['"]([A-Z]+)['"]&&u\.pathname\.includes\(['"]([^'"]+)['"]\)\)/g,
];
for (const pattern of patterns) {
  for (const match of source.matchAll(pattern)) {
    const key = match[1] + " " + match[2];
    if (!routes.has(key)) {
      const start = Math.max(0, match.index - 90);
      const end = Math.min(source.length, match.index + 520);
      routes.set(key, source.slice(start, end).replace(/\s+/g, " "));
    }
  }
}
console.log("RUNTIME AUDIT — source only; no persisted state or secrets are read");
console.log("bundleBytes=" + Buffer.byteLength(source, "utf8") + " routeCount=" + routes.size);
for (const [route, snippet] of [...routes.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const safe = snippet
    .replace(/(x-v9-state-secret['"]?\s*[:=]\s*['"])[^'"]+(['"])/gi, "$1[REDACTED]$2")
    .replace(/(password|salt|hash|token)(['"]?\s*[:=]\s*['"])[^'"]+(['"])/gi, "$1$2[REDACTED]$3");
  console.log("\n[" + route + "]\n" + safe.slice(0, 680));
}
for (const term of ["function normalize(d){", "function safe(", "async function save(", "function audit(", "appServer", "ALHAMAL_REQUIRE_PASSWORD_ROTATION"]) {
  const index = source.indexOf(term);
  console.log("\n[SYMBOL " + term + "] " + (index < 0 ? "not found" : source.slice(Math.max(0, index - 40), Math.min(source.length, index + 420)).replace(/\s+/g, " ").slice(0, 480)));
}
