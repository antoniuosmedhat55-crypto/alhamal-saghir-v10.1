-- Phase 1 groundwork for the maintenance platform RBAC/workflow expansion.
-- Intentionally idempotent. This migration is staged for review and is NOT applied
-- to production by this commit. The current deployed app still uses its private
-- compressed state store; wire these columns into the application before applying.

begin;

insert into public.roles (code, name_ar, description, is_active)
values
  ('hr', 'الموارد البشرية', 'عرض الحضور والإجازات وتقارير الأداء', true),
  ('it_engineer', 'مهندس البرمجة', 'لوحة صحة النظام والسجلات والإعدادات التقنية', true)
on conflict (code) do update
set name_ar = excluded.name_ar,
    description = excluded.description,
    is_active = true,
    updated_at = now();

alter table public.users
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_rotation_completed_at timestamptz,
  add column if not exists last_seen_at timestamptz;

alter table public.faults
  add column if not exists assigned_to uuid references public.users(id) on delete set null,
  add column if not exists received_at timestamptz,
  add column if not exists completed_by uuid references public.users(id) on delete set null,
  add column if not exists approved_by uuid references public.users(id) on delete set null,
  add column if not exists approval_notes text,
  add column if not exists source text not null default 'internal';

alter table public.tasks
  add column if not exists accepted_at timestamptz,
  add column if not exists completed_by uuid references public.users(id) on delete set null,
  add column if not exists approved_by uuid references public.users(id) on delete set null,
  add column if not exists approval_notes text;

alter table public.attendance
  add column if not exists auto_closed boolean not null default false,
  add column if not exists closure_source text;

alter table public.leaves
  add column if not exists excluded_from_performance boolean not null default true;

alter table public.water_logs
  add column if not exists location_id uuid references public.locations(id) on delete set null,
  add column if not exists tank_name text;

create index if not exists faults_assigned_to_status_idx
  on public.faults (assigned_to, status, created_at desc);

create index if not exists tasks_assigned_to_status_idx
  on public.tasks (assigned_to, status, created_at desc);

create index if not exists attendance_user_date_idx
  on public.attendance (user_id, attendance_date desc);

create index if not exists water_logs_location_tank_date_idx
  on public.water_logs (location_id, tank_name, log_date desc);

commit;
