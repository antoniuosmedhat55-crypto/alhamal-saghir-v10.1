import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "20261027000100_expand_maintenance_rbac.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");
const checks = [];
function test(name, fn) {
  fn();
  checks.push(name);
}

test("migration is wrapped in a transaction", () => {
  assert.match(sql, /^\s*begin\s*;/i);
  assert.match(sql, /\bcommit\s*;\s*$/i);
});

test("new roles are inserted idempotently", () => {
  assert.match(sql, /'hr'\s*,\s*'الموارد البشرية'/);
  assert.match(sql, /'it_engineer'\s*,\s*'مهندس البرمجة'/);
  assert.match(sql, /on\s+conflict\s*\(code\)\s*do\s+update/i);
});

test("all additions use idempotent column or index guards", () => {
  for (const match of sql.matchAll(/\balter\s+table\s+public\.([a-z_]+)([\s\S]*?);/gi)) {
    const [, table, body] = match;
    const declarations = body.split(",").map((part) => part.trim()).filter(Boolean);
    for (const declaration of declarations) {
      assert.match(
        declaration,
        /^add\s+column\s+if\s+not\s+exists\b/i,
        `Non-idempotent column statement in public.${table}: ${declaration}`,
      );
    }
  }
  for (const match of sql.matchAll(/\bcreate\s+index\b[^;]*;/gi)) {
    assert.match(match[0], /^create\s+index\s+if\s+not\s+exists\b/i);
  }
});

test("required security and workflow fields exist", () => {
  const expected = [
    ["users", "must_change_password"],
    ["users", "password_rotation_completed_at"],
    ["users", "last_seen_at"],
    ["faults", "assigned_to"],
    ["faults", "received_at"],
    ["faults", "completed_by"],
    ["faults", "approved_by"],
    ["faults", "approval_notes"],
    ["tasks", "accepted_at"],
    ["tasks", "completed_by"],
    ["tasks", "approved_by"],
    ["tasks", "approval_notes"],
    ["attendance", "auto_closed"],
    ["attendance", "closure_source"],
    ["leaves", "excluded_from_performance"],
    ["water_logs", "location_id"],
    ["water_logs", "tank_name"],
  ];
  for (const [table, column] of expected) {
    const tableBlock = new RegExp(
      `alter\\s+table\\s+public\\.${table}\\b[\\s\\S]*?;`,
      "i",
    ).exec(sql)?.[0] ?? "";
    assert.match(
      tableBlock,
      new RegExp(`add\\s+column\\s+if\\s+not\\s+exists\\s+${column}\\b`, "i"),
      `Missing idempotent field public.${table}.${column}`,
    );
  }
});

test("migration contains no destructive data/schema statements", () => {
  assert.doesNotMatch(sql, /\bdrop\s+(?:table|column|schema|database|policy|function)\b/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
});

test("indexes exist for common workload lookups", () => {
  for (const index of [
    "faults_assigned_to_status_idx",
    "tasks_assigned_to_status_idx",
    "attendance_user_date_idx",
    "water_logs_location_tank_date_idx",
  ]) {
    assert.match(sql, new RegExp(`create\\s+index\\s+if\\s+not\\s+exists\\s+${index}\\b`, "i"));
  }
});

console.log(`PASS ${checks.length} migration contract checks\\n- ${checks.join("\\n- ")}`);
