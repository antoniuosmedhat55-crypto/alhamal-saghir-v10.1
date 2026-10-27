const grants = Object.freeze({
  "مدير النظام": new Set(["accounts:read", "accounts:write", "roles:write", "faults:read", "faults:assign", "faults:approve", "faults:return", "reports:read", "settings:write"]),
  "مدير الصيانة": new Set(["faults:read", "faults:assign", "faults:approve", "faults:return", "reports:read", "purchases:review", "leaves:review"]),
  "مشرف الصيانة": new Set(["faults:read", "faults:assign", "faults:approve", "faults:return", "reports:read"]),
  "فني صيانة": new Set(["faults:read_assigned", "faults:accept", "faults:start", "faults:submit", "attendance:own", "purchases:request", "leaves:request"]),
  "الموارد البشرية": new Set(["attendance:read", "leaves:review", "reports:read"]),
  "مهندس تقنية المعلومات": new Set(["system:health", "system:logs"]),
});

export function canAccess(role, permission) {
  return Boolean(typeof role === "string" && typeof permission === "string" && grants[role]?.has(permission));
}

export function requireAccess(actor, permission) {
  if (!actor || typeof actor.id !== "string" || !actor.id || !canAccess(actor.role, permission)) {
    const error = new Error("غير مصرح بتنفيذ العملية");
    error.code = "FORBIDDEN";
    error.status = 403;
    throw error;
  }
  return true;
}

export function listPermissions(role) {
  return [...(grants[role] || [])];
}
