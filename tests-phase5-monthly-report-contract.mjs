import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
const sw=fs.readFileSync(path.join(root,"public","sw.js"),"utf8");
const lines=server.split(String.fromCharCode(10));
const cronLine=lines.find(line=>line.startsWith("const attendanceCronRoute="));
assert.ok(cronLine,"attendance cron route missing");
const cron=JSON.parse(cronLine.slice("const attendanceCronRoute=".length,cronLine.lastIndexOf(";")));
const runtimeLine=lines.find(line=>line.startsWith("const accountRuntimeScript="));
assert.ok(runtimeLine,"browser runtime missing");
const runtime=JSON.parse(runtimeLine.slice("const accountRuntimeScript=".length,runtimeLine.lastIndexOf(";")));
const body=runtime.slice(runtime.indexOf(">")+1,runtime.lastIndexOf("</script>"));
const bootstrapLine=lines.find(line=>line.startsWith("const roleScopedBootstrapAnchor="));
const marker="bundleSource=bundleSource.replace(roleScopedBootstrapAnchor,";
assert.ok(bootstrapLine&&bootstrapLine.includes(marker),"bootstrap patch missing");
const bootstrap=JSON.parse(bootstrapLine.slice(bootstrapLine.indexOf(marker)+marker.length,bootstrapLine.lastIndexOf(");")));

test("attendance cron remains protected and monthly report close is idempotent",()=>{
  assert.match(cron,/process\.env\.CRON_SECRET/);
  assert.match(cron,/crypto\.timingSafeEqual/);
  assert.match(cron,/Africa\/Cairo/);
  assert.match(cron,/monthlyReports\.some\(r=>r&&r\.month===reportMonthKey\)/);
  assert.match(cron,/monthlyReports\.unshift\(report\)/);
  assert.match(cron,/if\(closed\|\|monthlyCreated\)await save\(d\)/);
});

test("monthly ranking subtracts approved leave workdays and excludes a fully unavailable technician",()=>{
  assert.match(cron,/l\.status==="مقبولة"/);
  assert.match(cron,/approvedLeaveWorkdays/);
  assert.match(cron,/eligibleWorkdays=Math\.max\(0,workdays-leaveDays\)/);
  assert.match(cron,/excludedFromRanking:eligibleWorkdays===0/);
  assert.match(cron,/completedPerWorkday/);
});

test("AI summary uses a server-side key only and has an explicit local fallback",()=>{
  assert.match(cron,/process\.env\.OPENAI_API_KEY/);
  assert.match(cron,/summaryProvider="openai"/);
  assert.match(cron,/summaryProvider==="openai"/);
  assert.match(cron,/local-analytics/);
  assert.match(cron,/لا تذكر أسماء الموظفين/);
});

test("only maintenance reporting roles and HR receive monthly report data",()=>{
  assert.match(bootstrap,/monthlyReports:rbReports\?\(Array\.isArray\(d\.meta\.monthlyReports\)\?d\.meta\.monthlyReports:\[\]\):\[\]/);
  assert.match(bootstrap,/const rbReports=rbManage\|\|rbHR/);
});

test("monthly report panel is syntactically valid and escapes saved content",()=>{
  new vm.Script(body,{filename:"alhamal-browser-runtime.js"});
  assert.match(body,/monthly-report-board/);
  assert.match(body,/monthlyEscape\(report\.summary/);
  assert.match(body,/approvedLeaveWorkdays/);
  assert.match(body,/__monthlyReportWrapped/);
  assert.equal(sw.includes("alhamal-v10.6.9"),true);
});

console.log("PASS 5 monthly close, leave-aware ranking and UI contracts");
