import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bundlePath = path.join(root, ".workbench", "server-bundle.js");
if (!fs.existsSync(bundlePath)) throw new Error("Run npm run source:extract before this audit.");
const source = fs.readFileSync(bundlePath, "utf8");
const wrapperPath = path.join(root, "server.js");
const wrapperSource = fs.readFileSync(wrapperPath, "utf8");
const wrapperPath = path.join(root, "server.js");
const wrapperSource = fs.readFileSync(wrapperPath, "utf8");
const runtimeAnchors = [];
for (const line of wrapperSource.split("\\n")) {
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
for (const term of ["function applyRole", "function renderNav", "navItems", 'role==="فني صيانة"', "الموارد البشرية", "مهندس تقنية المعلومات", "usersList", "data-role", "function applyNav()", "function openMoreSection", "function openSection", "currentUser", "user.role", 'id="nav"', "function render(", "function show(", "function init(", "page-attendance", "attendancePage", "function bootstrap("]) {
  const index = htmlSource.indexOf(term);
  console.log("\\n[UI " + term + "] " + (index < 0 ? "not found" : htmlSource.slice(Math.max(0, index - 80), Math.min(htmlSource.length, index + 460)).replace(/\\s+/g, " ").slice(0, 520)));
}

for (const term of ["function normalize(d){", "function safe(", "async function save(", "function audit(", "appServer", "ALHAMAL_REQUIRE_PASSWORD_ROTATION", "const ROLES=", "const ADM=", "const OPS=", "const PRIV=", "const TECH=", "const LEAVE=", "function performance("]) {
  const index = source.indexOf(term);
  console.log("\n[SYMBOL " + term + "] " + (index < 0 ? "not found" : source.slice(Math.max(0, index - 40), Math.min(source.length, index + 420)).replace(/\s+/g, " ").slice(0, 480)));
}
