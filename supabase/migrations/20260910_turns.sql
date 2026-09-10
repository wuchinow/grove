-- Per-turn API call logging, for the admin cost/usage dashboard.
-- One row per call to /api/anthropic. Best-effort: a logging failure must
-- never block a tutor response, so this is written from a fire-and-forget
-- call in the route handler.
--
-- NOTE: this migration has already been applied directly to the live
-- Supabase project (xpawazygyvupevgjusyv) via Supabase:apply_migration.
-- It's included here so the schema change is tracked in the repo. Every
-- statement is guarded, so re-applying it is a safe no-op.

create table if not exists public.turns (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  student_id text references public.students (student_id) on delete set null,
  kind text not null default 'tutor',       -- 'extract' | 'topic' | 'tutor'
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  ok boolean not null default true
);

create index if not exists turns_created_at_idx on public.turns (created_at);
create index if not exists turns_student_id_idx on public.turns (student_id);

-- Same pattern as students/groves: service role only, RLS on with no
-- policies, so no client can read or write this directly.
alter table public.turns enable row level security;
