# Authorization and fault workflow contract

This document defines acceptance criteria for the next application integration step. It is not a claim that the current production application already enforces every rule below.

## Role boundaries

| Role | Permitted work | Explicit restrictions |
| --- | --- | --- |
| System Admin | Manage accounts, roles, locations and settings; assign/approve work; view audit and reports | Must not bypass server-side validation; self-deactivation and disabling the last active admin are prohibited |
| Maintenance Director | View maintenance dashboard; coordinate work and purchases; approve leaves and reports as authorized | No account/role administration unless separately granted |
| Maintenance Supervisor | Create and assign faults; review submitted work; approve or return completion; follow up delays | Cannot alter historical events silently |
| Technician | Accept assigned faults; update own work; submit completion; submit purchase/leave requests; record own attendance/readings | Cannot approve own submitted completion or access other technicians' private attendance records |
| HR | Read attendance, leave and performance; make permitted leave decisions | Cannot clock in/out or edit maintenance work |
| IT Engineer | View system health, operational logs and diagnostics | No access to plaintext passwords/secrets; no arbitrary database writes from the UI |

## Fault state transitions

1. `created -> assigned`: supervisor or authorized administrator assigns a responsible technician.
2. `assigned -> accepted`: the assigned technician accepts the work.
3. `accepted -> in_progress`: the assigned technician starts work.
4. `in_progress -> submitted_for_approval`: the technician submits work for review.
5. `submitted_for_approval -> completed`: supervisor or authorized administrator approves.
6. `assigned | accepted | in_progress | submitted_for_approval -> returned`: authorized reviewer returns work with a reason.
7. `returned -> assigned` or `returned -> in_progress`: reassignment or resumed work, according to reviewer decision.
8. `completed` is terminal for ordinary users. Corrections require a separate audited administrative process.

## Server-side acceptance criteria

- Every transition validates current state, role, assignment, and required fields on the server.
- Each transition appends an immutable event containing actor ID, previous state, next state, server timestamp, and optional reason.
- The client cannot set its own role, actor ID, completion approval, or server timestamp.
- Duplicate submissions are idempotent or rejected without duplicating audit events.
- Rejected actions return a generic permission/state error and do not mutate stored data.
- Existing state and normalized tables must be reconciled before choosing a storage target. No migration or seed is implied by this contract.

## Required tests before integration

- Happy path from assignment through approval.
- Technician cannot approve own work.
- Wrong technician cannot accept or update an assignment.
- Cannot skip approval or mutate completed work.
- Supervisor/admin actions are checked server-side.
- Missing completion details and missing return reasons are rejected where required.
- Regression tests for login, logout, attendance, purchases, leaves, reports and mobile layouts.
