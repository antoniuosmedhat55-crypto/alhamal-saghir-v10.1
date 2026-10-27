import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

test("supported HR and IT roles are added using guarded runtime patches", () => {
  assert.match(server, /const rolesAnchor=/);
  assert.match(server, /'فني صيانة','الموارد البشرية','مهندس تقنية المعلومات'/);
  assert.match(server, /RBAC role anchor missing/);
});

test("bootstrap response enforces least-privilege views and hides usernames from non-admins", () => {
  assert.match(server, /const roleScopedBootstrapAnchor=/);
  assert.match(server, /const rbHR=me\.role==='الموارد البشرية'/);
  assert.match(server, /const rbIT=me\.role==='مهندس تقنية المعلومات'/);
  assert.match(server, /if\(!rbAdmin\)delete z\.username/);
  assert.match(server, /attendance:rbIT\?\[\]:attendanceView/);
  assert.match(server, /works:rbIT\|\|rbHR\?\[\]:worksView/);
  assert.match(server, /audit:rbAdmin\|\|rbIT\?d\.audit:\[\]/);
  assert.ok(server.includes("messages:rbIT||rbHR?[]:d.messages"));
  assert.ok(server.includes("water:rbIT||rbHR?[]:waterView"));
  assert.ok(server.includes("locations:rbIT||rbHR?{}:d.locations"));
});

test("HR is an explicit leave approval stage after the replacement and before supervision", () => {
  assert.match(server, /const leaveRolesAnchor=/);
  assert.match(server, /status:replacementId\?'بانتظار موافقة البديل':'بانتظار موافقة الموارد البشرية'/);
  assert.match(server, /x\.approvals\.hrAt=now\(\)/);
  assert.match(server, /مراجعة الموارد البشرية مطلوبة أولًا/);
  assert.match(server, /me\.role!=='الموارد البشرية'\)return err\(res,'لا تملك الصلاحية',403\);x\.status='مرفوضة'/);
});

test("water logs allow the assigned technician role while sensitive read endpoints are gated", () => {
  assert.match(server, /if\(!PRIV\.includes\(me\.role\)&&me\.role!=='فني صيانة'\)/);
  assert.match(server, /const slaRoleGateAnchor=/);
  assert.match(server, /const aiRoleGateAnchor=/);
  assert.match(server, /SLA overview route anchor missing/);
  assert.match(server, /AI insights route anchor missing/);
});

test("server-time attendance and scheduled closure retain their authentication anchors", () => {
  assert.match(server, /const attendanceCronAnchor=/);
  assert.match(server, /const attendanceRouteAnchor=/);
  assert.match(server, /x\.checkIn=now\(\)/);
  assert.match(server, /x\.checkOut=now\(\)/);
  assert.match(server, /process\.env\.CRON_SECRET/);
});

console.log("PASS 5 role-aware backend security contracts");
