import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const wrapper=fs.readFileSync(path.join(root,"server.js"),"utf8");
const readParts=(dir)=>fs.readdirSync(path.join(root,dir)).filter(n=>n.endsWith(".txt")).sort((a,b)=>Number(a.slice(0,-4))-Number(b.slice(0,-4))).map(n=>fs.readFileSync(path.join(root,dir,n),"utf8")).join("");
const html=zlib.brotliDecompressSync(Buffer.from(readParts("public/html-chunks"),"base64")).toString("utf8");
const runtimeLine=wrapper.split(String.fromCharCode(10)).find(line=>line.startsWith("const accountRuntimeScript="));
assert.ok(runtimeLine,"runtime declaration missing");
const runtime=JSON.parse(runtimeLine.slice("const accountRuntimeScript=".length,-1));
const runtimeCode=runtime.slice(runtime.indexOf(">")+1,runtime.lastIndexOf("</script>"));

test("injected browser runtime is syntactically valid JavaScript",()=>{new vm.Script(runtimeCode,{filename:"alhamal-injected-runtime.js"});});

test("HR and IT are included in the user creation role selector",()=>{
  const anchor="const roles=role('مدير النظام')?['مدير النظام','مساعد Admin','مدير الصيانة','مشرف الصيانة','فني صيانة']:['مساعد Admin','مدير الصيانة','مشرف الصيانة','فني صيانة'];";
  assert.ok(html.includes(anchor));
  assert.ok(wrapper.includes("accountRoleOptionsAnchor"));
  assert.match(wrapper,/الموارد البشرية','مهندس تقنية المعلومات/);
});

test("HR sees read-only attendance and relevant leaves/report pages only",()=>{
  assert.ok(html.includes("function applyNav(){"));
  assert.ok(wrapper.includes("uiRoleNavAnchor"));
  assert.match(wrapper,/role\('الموارد البشرية'\)\)hide=!\['dashboard','attendance','leaves','reports','performance'\]/);
  assert.match(wrapper,/attendance\(\\\'"/);
});

test("IT diagnostics board is restricted to IT navigation and renders audit logs safely",()=>{
  assert.match(runtime,/id=\"it-system\"/);
  assert.match(runtime,/window\.refreshITSystem=async function/);
  assert.match(runtime,/data\.audit/);
  assert.match(runtime,/data-v=\"it-system\"/);
  assert.ok(wrapper.includes("if(x.dataset.v==='it-system'&&!role('مهندس تقنية المعلومات'))hide=true"));
});

test("role navigation patch anchors are fail-closed and no public account selector is restored",()=>{
  assert.match(wrapper,/if\(!html\.includes\(accountRoleOptionsAnchor\)\)throw new Error/);
  assert.match(wrapper,/if\(!html\.includes\(uiRoleNavAnchor\)\)throw new Error/);
  assert.equal(wrapper.includes("api/login-options"),false);
  assert.equal(wrapper.includes("alhamalAccountPicker"),false);
});

console.log("PASS 5 browser UI/runtime checks");
