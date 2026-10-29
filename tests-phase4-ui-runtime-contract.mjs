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
  assert.ok(wrapper.includes("role('الموارد البشرية')?'none':''"));
  assert.ok(wrapper.includes("role('الموارد البشرية')?'none':''"));
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

test("public HTML removes hard-coded personnel names from visible and hidden views",()=>{
  const teamAnchor='<div class="muted">المالك الرئيسي: انطونيوس مدحت • المساعد: ماجد • المدير: مهندس إيهاب زكي</div>';
  const adminAnchor='<div class="muted">المالك: انطونيوس مدحت — مدير النظام وصاحب الصلاحيات الكاملة</div>';
  assert.ok(html.includes(teamAnchor),"source team label anchor should be reviewed");
  assert.ok(html.includes(adminAnchor),"source administrator label anchor should be reviewed");
  assert.ok(wrapper.includes("publicTeamNamesAnchor"));
  assert.ok(wrapper.includes("publicAdminOwnerAnchor"));
  let safeHtml=html.replace(teamAnchor,'<div class="muted">إدارة فريق الصيانة والأدوار</div>');
  safeHtml=safeHtml.replace(adminAnchor,'<div class="muted">إدارة المنصة والأدوار والصلاحيات</div>');
  safeHtml=safeHtml.replaceAll("المطور: انطونيوس مدحت","فريق تطوير المنصة");
  assert.equal(safeHtml.includes("انطونيوس مدحت"),false,"personal owner name must not remain in public HTML");
  assert.equal(safeHtml.includes("مهندس إيهاب زكي"),false,"manager name must not remain in public HTML");
  assert.equal(safeHtml.includes("ماجد"),false,"assistant name must not remain in public HTML");
});
test("wrapper and public assets use hotfix version 10.6.8",()=>{
  assert.ok(wrapper.includes('html.replaceAll("10.6.4","10.6.8")'));
  assert.ok(wrapper.includes('replaceAll("10.6.1","10.6.8").replaceAll("10.6.4","10.6.8")'));
});
console.log("PASS 7 browser UI/runtime checks");
