import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const checks = [];

function test(name, fn) {
  fn();
  checks.push(name);
}

test("cron route is injected before ordinary session authentication", () => {
  assert.match(server, /const attendanceCronAnchor=/);
  assert.match(server, /Attendance cron route anchor not found/);
  assert.match(server, /bundleSource\.replace\(attendanceCronAnchor,attendanceCronRoute\+attendanceCronAnchor\)/);
});

test("cron invocation requires constant-time CRON_SECRET validation", () => {
  assert.match(server, /process\.env\.CRON_SECRET/);
  assert.match(server, /crypto\.timingSafeEqual\(Buffer\.from\(expected\),Buffer\.from\(supplied\)\)/);
  assert.match(server, /expected\.length!==supplied\.length/);
});

test("closure uses Africa/Cairo local date and a 17:00 local close timestamp", () => {
  assert.match(server, /timeZone:'Africa\/Cairo'/);
  assert.match(server, /Number\(p\.hour\)<17/);
  assert.match(server, /Date\.UTC\(Number\(p\.year\),Number\(p\.month\)-1,Number\(p\.day\),17,0,0\)-offsetMillis/);
});

test("only open attendance entries are auto-closed and the source is recorded", () => {
  assert.match(server, /row\.date===localDate&&row\.checkIn&&!row\.checkOut/);
  assert.match(server, /row\.autoClosed=true/);
  assert.match(server, /row\.closureSource='vercel_cron_17_cairo'/);
  assert.match(server, /if\(closed\)await save\(d\)/);
});

test("Vercel cron schedules only weekdays and handles Cairo DST with two daily UTC windows", () => {
  const crons = config.crons ?? [];
  assert.equal(crons.length, 2);
  assert.ok(crons.every((job) => job.path === "/api/cron/attendance-close"));
  assert.deepEqual(crons.map((job) => job.schedule).sort(), ["0 14 * * 0-4", "0 15 * * 0-4"]);
});

console.log(`PASS ${checks.length} attendance cron contract checks`);
for (const name of checks) console.log("- " + name);
