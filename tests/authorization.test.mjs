import test from "node:test";
import assert from "node:assert/strict";
import { canAccess, listPermissions, requireAccess } from "../src/domain/authorization.js";

test("administrator can manage accounts but technicians cannot", () => {
  assert.equal(canAccess("مدير النظام", "accounts:write"), true);
  assert.equal(canAccess("فني صيانة", "accounts:write"), false);
});

test("technician can submit assigned work but cannot approve it", () => {
  assert.equal(canAccess("فني صيانة", "faults:submit"), true);
  assert.equal(canAccess("فني صيانة", "faults:approve"), false);
});

test("maintenance reviewers can approve and return faults", () => {
  assert.equal(canAccess("مشرف الصيانة", "faults:approve"), true);
  assert.equal(canAccess("مدير الصيانة", "faults:return"), true);
});

test("IT can read health diagnostics but has no implied account access", () => {
  assert.equal(canAccess("مهندس تقنية المعلومات", "system:health"), true);
  assert.equal(canAccess("مهندس تقنية المعلومات", "accounts:read"), false);
});

test("unknown roles and permissions fail closed", () => {
  assert.equal(canAccess("unknown", "accounts:read"), false);
  assert.equal(canAccess("مدير النظام", "arbitrary:write"), false);
  assert.throws(() => requireAccess({ id: "x", role: "unknown" }, "accounts:read"), e => e.code === "FORBIDDEN" && e.status === 403);
  assert.throws(() => requireAccess({ id: "x", role: "فني صيانة" }, "faults:approve"), e => e.code === "FORBIDDEN");
});

test("permission lists are copied and cannot mutate the policy", () => {
  const listed = listPermissions("مدير النظام");
  listed.push("arbitrary:write");
  assert.equal(canAccess("مدير النظام", "arbitrary:write"), false);
});
