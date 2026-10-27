export const FAULT_STATUS = Object.freeze({
  CREATED: "created",
  ASSIGNED: "assigned",
  ACCEPTED: "accepted",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted_for_approval",
  RETURNED: "returned",
  COMPLETED: "completed",
});

const transitions = Object.freeze({
  [FAULT_STATUS.CREATED]: new Set([FAULT_STATUS.ASSIGNED]),
  [FAULT_STATUS.ASSIGNED]: new Set([FAULT_STATUS.ACCEPTED, FAULT_STATUS.RETURNED]),
  [FAULT_STATUS.ACCEPTED]: new Set([FAULT_STATUS.IN_PROGRESS, FAULT_STATUS.RETURNED]),
  [FAULT_STATUS.IN_PROGRESS]: new Set([FAULT_STATUS.SUBMITTED, FAULT_STATUS.RETURNED]),
  [FAULT_STATUS.SUBMITTED]: new Set([FAULT_STATUS.COMPLETED, FAULT_STATUS.RETURNED]),
  [FAULT_STATUS.RETURNED]: new Set([FAULT_STATUS.ASSIGNED, FAULT_STATUS.IN_PROGRESS]),
  [FAULT_STATUS.COMPLETED]: new Set(),
});

const roleActions = Object.freeze({
  "مدير النظام": new Set(["assign", "approve", "return"]),
  "مشرف الصيانة": new Set(["assign", "approve", "return"]),
  "مدير الصيانة": new Set(["assign", "approve", "return"]),
  "فني صيانة": new Set(["accept", "start", "submit"]),
});

export function canTransitionFault(from, to) {
  return Boolean(transitions[from]?.has(to));
}

export function canPerformFaultAction(role, action) {
  return Boolean(roleActions[role]?.has(action));
}

export function transitionFault(fault, nextStatus, actor, at = new Date().toISOString(), reason = "") {
  if (!fault || typeof fault !== "object" || Array.isArray(fault)) throw new TypeError("fault must be an object");
  if (!actor?.id || !actor?.role) throw new TypeError("actor id and role are required");
  if (!canTransitionFault(fault.status, nextStatus)) {
    throw new Error(`Invalid fault transition: ${fault.status} -> ${nextStatus}`);
  }
  const actionByStatus = {
    [FAULT_STATUS.ASSIGNED]: "assign",
    [FAULT_STATUS.ACCEPTED]: "accept",
    [FAULT_STATUS.IN_PROGRESS]: "start",
    [FAULT_STATUS.SUBMITTED]: "submit",
    [FAULT_STATUS.COMPLETED]: "approve",
    [FAULT_STATUS.RETURNED]: "return",
  };
  const action = actionByStatus[nextStatus];
  if (!canPerformFaultAction(actor.role, action)) throw new Error(`Role cannot perform fault action: ${actor.role} / ${action}`);
  if (nextStatus === FAULT_STATUS.RETURNED && !String(reason).trim()) throw new Error("A return reason is required");
  if (nextStatus === FAULT_STATUS.ASSIGNED && actor.role === "فني صيانة") throw new Error("Technicians cannot assign faults");
  return {
    ...fault,
    status: nextStatus,
    updatedAt: at,
    events: [...(Array.isArray(fault.events) ? fault.events : []), {
      from: fault.status, to: nextStatus, actorId: actor.id, actorRole: actor.role, at,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    }],
  };
}
