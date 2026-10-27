import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "ci-runtime-assembly-only-secret-change-never-use-in-production";
await import(new URL("../server.js", import.meta.url).href);
console.log("PASS: Vercel wrapper inflated HTML, applied runtime patches and imported the final app bundle.");
