import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const tests = [];

function test(name, fn) {
  fn();
  tests.push(name);
}

test("server patches the existing attendance endpoint, not a parallel datastore", () => {
  assert.match(server, /const attendanceRouteAnchor=/);
  assert.match(server, /Attendance route date anchor not found/);
  assert.match(server, /bundleSource\.replace\(attendanceRouteAnchor/);
});

test("self attendance date comes from the server's Cairo date helper", () => {
  assert.match(server, /const date=target===me\.id\?dateKey\(\):\(b\.date\|\|dateKey\(\)\)/);
});

test("clock-in ignores client-supplied timestamps", () => {
  assert.match(server, /const attendanceInAnchor="if\(b\.action==='in'\)x\.checkIn=b\.time\|\|now\(\);else if\(b\.action==='out'\)\{"/);
  assert.match(server, /x\.checkIn=now\(\);\}else if\(b\.action==='out'\)/);
  assert.match(server, /تم تسجيل الحضور بالفعل/);
});

test("clock-out ignores client-supplied timestamps and blocks duplicate punches", () => {
  assert.match(server, /const attendanceOutAnchor="x\.checkOut=b\.time\|\|now\(\);"/);
  assert.match(server, /x\.checkOut=now\(\);/);
  assert.match(server, /تم تسجيل الانصراف بالفعل لهذا اليوم/);
});

test("missing patch anchors fail the server initialization instead of silently skipping security", () => {
  assert.match(server, /Attendance route date anchor not found/);
  assert.match(server, /Attendance clock-in anchor not found/);
  assert.match(server, /Attendance clock-out anchor not found/);
});

console.log(`PASS ${tests.length} attendance contract checks`);
for (const name of tests) console.log("- " + name);
