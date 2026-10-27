import test from "node:test";
import assert from "node:assert/strict";
import { FAULT_STATUS as S, canTransitionFault, transitionFault } from "../src/domain/fault-lifecycle.js";

test("happy path: assigned, accepted, in progress, submitted, approved", () => {
  const tech = { id: "tech-1", role: "فني صيانة" };
  const supervisor = { id: "sup-1", role: "مشرف الصيانة" };
  let fault = { id: "fault-1", status: S.ASSIGNED, events: [] };
  fault = transitionFault(fault, S.ACCEPTED, tech, "2026-10-27T09:00:00.000Z");
  fault = transitionFault(fault, S.IN_PROGRESS, tech, "2026-10-27T09:05:00.000Z");
  fault = transitionFault(fault, S.SUBMITTED, tech, "2026-10-27T10:00:00.000Z");
  fault = transitionFault(fault, S.COMPLETED, supervisor, "2026-10-27T10:10:00.000Z");
  assert.equal(fault.status, S.COMPLETED);
  assert.equal(fault.events.length, 4);
  assert.equal(fault.events.at(-1).actorId, "sup-1");
});

test("cannot skip approval or mutate a completed fault", () => {
  assert.equal(canTransitionFault(S.IN_PROGRESS, S.COMPLETED), false);
  assert.throws(() => transitionFault({ status: S.IN_PROGRESS }, S.COMPLETED, { id: "t", role: "فني صيانة" }), /Invalid fault transition/);
  assert.equal(canTransitionFault(S.COMPLETED, S.IN_PROGRESS), false);
});

test("technicians cannot approve submitted work", () => {
  assert.throws(() => transitionFault({ status: S.SUBMITTED }, S.COMPLETED, { id: "t", role: "فني صيانة" }), /Role cannot perform/);
});

test("returning work requires a reason and a reviewer", () => {
  assert.throws(() => transitionFault({ status: S.IN_PROGRESS }, S.RETURNED, { id: "t", role: "فني صيانة" }, undefined, "ناقص"), /Role cannot perform/);
  assert.throws(() => transitionFault({ status: S.IN_PROGRESS }, S.RETURNED, { id: "s", role: "مشرف الصيانة" }), /return reason/);
  const returned = transitionFault({ status: S.IN_PROGRESS }, S.RETURNED, { id: "s", role: "مشرف الصيانة" }, "2026-10-27T11:00:00.000Z", "ناقص قطع غيار");
  assert.equal(returned.events[0].reason, "ناقص قطع غيار");
});

test("transition requires actor identity and role", () => {
  assert.throws(() => transitionFault({ status: S.ASSIGNED }, S.ACCEPTED, {}), /actor id and role/);
});
