# Alhamal Saghir — Safe Implementation Plan

## Baseline and non-negotiable safeguards

- Current production baseline: V10.6.4, commit `59ad81e9c77560d2b82a84eb5fb196024abb1518`.
- Runtime currently reconstructs the app from Brotli/base64 chunks in `public/html-chunks/` and `bundle-chunks/`; `server.js` applies runtime HTML patches. Do not edit generated chunks manually without a reproducible build and round-trip tests.
- The active application state is stored through the `v9-state` Supabase Edge Function and private RPC-backed state. Public normalized tables exist but were observed empty. Do not assume they are authoritative or seed them blindly.
- No destructive schema/state migration, password reset, account reactivation, or production deploy is authorized by this plan.
- Never re-enable a retired or exposed default password. Any account recovery must use a strong one-time credential and mandatory rotation, handled through an authorized secure flow.

## Delivery phases

### Phase 0 — Baseline protection
1. Preserve the current production commit.
2. Keep all work on a feature branch and submit it for review before production.
3. Re-run syntax, security, and browser smoke tests after every change.

### Phase 1 — Establish a reproducible source workflow
1. Identify the exact build/packing procedure that produces the HTML and server bundle chunks.
2. Add a deterministic unpack/build/pack script and round-trip tests before touching runtime behavior.
3. Keep generated artifacts reproducible and verify no public credential or secret is emitted.

### Phase 2 — Authorization and account administration
1. Document a server-side permission matrix for Admin, Maintenance Director, Supervisor, Technician, HR, and IT Engineer.
2. Add server-enforced checks to every mutating endpoint; UI hiding alone is not authorization.
3. Preserve existing account IDs and history; use inactive/soft-deleted status rather than hard deletion.
4. Test denied cross-role requests as well as permitted actions.

### Phase 3 — Fault and work lifecycle
1. Model fault status transitions explicitly: created, assigned, accepted, in progress, submitted for approval, approved/completed, returned/rejected.
2. Validate transitions on the server and record actor/time/audit events.
3. Preserve optional form fields and existing records.

### Phase 4 — Attendance, leave, purchases, and water logs
1. Use server time as the authoritative clock.
2. Make leave approvals and substitute assignment explicit and auditable.
3. Keep purchase requests independent of asset records.
4. Validate dates, numeric readings, ownership, and role permissions.

### Phase 5 — Reports, HR, IT, and rollout
1. Build reports from the authoritative data source only after source-of-truth reconciliation.
2. HR remains read-only for attendance/performance except explicitly granted leave decisions; HR cannot clock in/out.
3. IT diagnostics must not expose secrets or permit arbitrary database changes from the browser.
4. Run regression checks at 360, 390, 412, and desktop widths; deploy preview first, then promote only after verification.

## Required verification before production

- `node --check server.js`
- `npm run test:security`
- Browser smoke tests for login, logout, role restrictions, task/fault lifecycle, attendance, leave, purchases, and mobile navigation.
- Confirm existing state version and backup remain unchanged during read-only tests.
- Confirm preview deployment commit and health endpoint before any production promotion.
