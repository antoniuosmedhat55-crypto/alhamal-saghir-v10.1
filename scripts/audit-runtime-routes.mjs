import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bundlePath = path.join(root, ".workbench", "server-bundle.js");
if (!fs.existsSync(bundlePath)) throw new Error("Run npm run source:extract before this audit.");
const source = fs.readFileSync(bundlePath, "utf8");
const wrapperPath = path.join(root, "server.js");
const wrapperSource = fs.readFileSync(wrapperPath, "utf8");
const runtimeAnchors = [];
for (const line of wrapperSource.split(String.fromCharCode(10))) {
  const match = line.match(/^const ([A-Za-z0-9]+Anchor)=/);
  if (!match || !line.includes("if(!bundleSource.includes(" + match[1] + "))")) continue;
  const marker = ";if(!bundleSource.includes(" + match[1] + "))";
  const end = line.indexOf(marker);
  if (end < 0) continue;
  try {
    runtimeAnchors.push({ name: match[1], value: JSON.parse(line.slice(line.indexOf("=") + 1, end)) });
  } catch {
    console.log("INVALID_RUNTIME_ANCHOR_LITERAL=" + match[1]);
    process.exitCode = 1;
  }
}
const missingAnchors = runtimeAnchors.filter((item) => !source.includes(item.value));
console.log("runtimePatchAnchors=" + runtimeAnchors.length + " missing=" + missingAnchors.map((item) => item.name).join(","));
if (missingAnchors.length) process.exitCode = 1;
const htmlPath = path.join(root, ".workbench", "app.html");
const htmlSource = fs.readFileSync(htmlPath, "utf8");
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
const detailRoutes = [
  ["attendance", "if(req.method==='POST'&&u.pathname==='/api/attendance')", 2200],
  ["leaves-create", "if(req.method==='POST'&&u.pathname==='/api/leaves')", 1700],
  ["leaves-review", "if(req.method==='PATCH'&&u.pathname.startsWith('/api/leaves/'))", 2600],
  ["work-update", "if(req.method==='PATCH'&&u.pathname.startsWith('/api/works/'))", 3000],
  ["purchase-create", "if(req.method==='POST'&&u.pathname==='/api/purchases')", 1500],
  ["account-create", "if(req.method==='POST'&&u.pathname==='/api/users')", 1600],
  ["bootstrap-response", "if(req.method==='GET'&&u.pathname==='/api/bootstrap')", 4400],
  ["state-load", "const d=await load();", 300],
];
for (const [name, needle, max] of detailRoutes) {
  const index = source.indexOf(needle);
  if (index < 0) { console.log("\n[DETAIL " + name + "] not found"); continue; }
  let snippet = source.slice(index, index + max).replace(/\s+/g, " ");
  console.log("\n[DETAIL " + name + "]\n" + snippet);
}


const applyNavAt=htmlSource.indexOf("function applyNav(){");
console.log("\\n[UI APPLY NAV FULL] "+(applyNavAt<0?"missing":htmlSource.slice(applyNavAt,applyNavAt+2400)));
console.log("\\n[UI BUILD NAV FULL] "+(()=>{const i=htmlSource.indexOf("function buildNav(){");return i<0?"missing":htmlSource.slice(i,i+2400)})());
console.log("\\n[UI ROLE FUNCTION] "+(()=>{const i=htmlSource.indexOf("function role(");return i<0?"missing":htmlSource.slice(i,i+650)})());
console.log("\\n[UI USER FORM] "+(()=>{const i=htmlSource.indexOf("function newUser(");return i<0?"missing":htmlSource.slice(i,i+1400)})());
console.log("\\n[UI RENDER ADMIN] "+(()=>{const i=htmlSource.indexOf("function renderAdmin(");return i<0?"missing":htmlSource.slice(i,i+1400)})());

console.log("\\n[UI NAV BUTTONS] "+[...htmlSource.matchAll(/<[^>]+class="nav"[^>]*>/g)].slice(0,90).map(m=>m[0].slice(0,260)).join(" || "));
console.log("\\n[UI ROLE OPTIONS] "+[...htmlSource.matchAll(/<option[^>]*>[^<]*/g)].slice(0,100).map(m=>m[0]).join(" || "));
console.log("\\n[UI NAVS ARRAY] "+(()=>{const i=htmlSource.indexOf("const navs=");return i<0?"missing":htmlSource.slice(i,i+1600)})());
console.log("\\n[UI RENDER ALL] "+(()=>{const i=htmlSource.indexOf("function renderAll(");return i<0?"missing":htmlSource.slice(i,i+1400)})());
console.log("\\n[UI API WRAPPER] "+(()=>{const i=htmlSource.indexOf("async function api(");return i<0?"missing":htmlSource.slice(i,i+700)})());
for (const term of ["function applyRole", "function renderNav", "navItems", 'role==="فني صيانة"', "الموارد البشرية", "مهندس تقنية المعلومات", "usersList", "data-role", "function applyNav()", "function openMoreSection", "function openSection", "currentUser", "user.role", 'id="nav"', "function render(", "function show(", "function init(", "page-attendance", "attendancePage", "function bootstrap("]) {
  const index = htmlSource.indexOf(term);
  console.log("\\n[UI " + term + "] " + (index < 0 ? "not found" : htmlSource.slice(Math.max(0, index - 80), Math.min(htmlSource.length, index + 460)).replace(/\\s+/g, " ").slice(0, 520)));
}


// Login-only diagnostic output: source text only, never persisted state or secrets.
const loginTargets = [
  ["POST /api/login", "req.method==='POST'&&u.pathname==='/api/login'", 1900],
  ["POST /api/logout", "req.method==='POST'&&u.pathname==='/api/logout'", 900],
  ["POST /api/me password update", "req.method==='PATCH'&&u.pathname==='/api/me'", 1900],
  ["GET /api/bootstrap", "req.method==='GET'&&u.pathname==='/api/bootstrap'", 1800],
  ["session guard", "function need(", 1000],
  ["state loader", "async function load(", 1200],
  ["state save", "async function save(", 1000],
  ["password hashing", "crypto.scryptSync(", 650],
];
for (const [label, needle, limit] of loginTargets) {
  let i = source.indexOf(needle);
  if (i < 0 && label === "POST /api/login") i = source.indexOf("u.pathname==='/api/login'");
  if (i < 0 && label === "POST /api/me password update") i = source.indexOf("u.pathname==='/api/me'");
  if (i < 0 && label === "POST /api/logout") i = source.indexOf("u.pathname==='/api/logout'");
  if (i < 0) { console.log("\\n[LOGIN DIAGNOSTIC " + label + "] NOT FOUND"); continue; }
  let snippet = source.slice(Math.max(0, i - 180), Math.min(source.length, i + limit)).replace(/\\s+/g, " ");
  snippet = snippet
    .replace(/((?:password|passwd|salt|hash|secret|token)[A-Za-z0-9_]*\\s*[:=]\\s*['"])[^'"]*(['"])/gi, "$1[REDACTED]$2")
    .replace(/((?:password|passwd|salt|hash|secret|token)[A-Za-z0-9_]*\\s*[:=]\\s*)[^,;}]+/gi, "$1[REDACTED]")
    .replace(/\\b[0-9a-f]{64,}\\b/gi, "[REDACTED_HEX]");
  console.log("\\n[LOGIN DIAGNOSTIC " + label + "]\\n" + snippet);
}
const envNames = [...new Set([...source.matchAll(/process\\.env\\.([A-Z][A-Z0-9_]*)/g)].map(m=>m[1]))].sort();
console.log("\\n[LOGIN DIAGNOSTIC SERVER ENVIRONMENT VARIABLE NAMES ONLY] " + envNames.join(", "));

for (const term of ["function normalize(d){", "function safe(", "async function save(", "function audit(", "appServer", "ALHAMAL_REQUIRE_PASSWORD_ROTATION", "const ROLES=", "const ADM=", "const OPS=", "const PRIV=", "const TECH=", "const LEAVE=", "function performance("]) {
  const index = source.indexOf(term);
  console.log("\n[SYMBOL " + term + "] " + (index < 0 ? "not found" : source.slice(Math.max(0, index - 40), Math.min(source.length, index + 420)).replace(/\s+/g, " ").slice(0, 480)));
}
