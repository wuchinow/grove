-- Stage 1 (Sept 12) admin Tuning section: six global levers on the existing
-- settings singleton row, next to fixed_costs/price_per_month. Defaults for
-- an empty/null column live in code (app/lib/settings.js DEFAULT_SETTINGS),
-- not here, so a fresh or partially-set row still behaves sanely.
--
-- Run via Supabase MCP from chat, per the runbook - Claude Code does not
-- apply migrations directly. Every statement is guarded, so re-applying
-- this file is a safe no-op.

alter table public.settings add column if not exists model text;
alter table public.settings add column if not exists effort text;
alter table public.settings add column if not exists starting_trees integer;
alter table public.settings add column if not exists mastery_threshold integer;
alter table public.settings add column if not exists interest_analogies boolean;
alter table public.settings add column if not exists sample_grove boolean;

-- Append-only audit trail backing the Settings page's change log (setting,
-- old, new, who, when). A dedicated table rather than a jsonb column on the
-- settings row, since that row is now read on every visitor's boot request
-- (GET /api/auth/session) and shouldn't grow forever.
create table if not exists public.settings_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  setting text not null,
  old_value text,
  new_value text,
  changed_by text references public.students (student_id) on delete set null
);

create index if not exists settings_log_created_at_idx on public.settings_log (created_at);

alter table public.settings_log enable row level security;

-- Snapshot the effort used on every tutor turn, alongside the model column
-- logTurn() already writes.
alter table public.turns add column if not exists effort text;
