-- In-app feedback. One row per submission from /api/feedback, mirrored
-- best-effort to a Notion database and emailed out - neither can block or
-- fail the submit, same pattern as turns logging.
--
-- NOTE: this migration has already been applied directly to the live
-- Supabase project (xpawazygyvupevgjusyv) via Supabase:apply_migration.
-- It's included here so the schema change is tracked in the repo. Every
-- statement is guarded, so re-applying it is a safe no-op.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  student_id text references public.students (student_id) on delete set null,
  email text,
  message text not null,
  page text,
  user_agent text,
  status text not null default 'open',   -- 'open' | 'archived'
  notes text
);

create index if not exists feedback_created_at_idx on public.feedback (created_at);
create index if not exists feedback_status_idx on public.feedback (status);

-- Same pattern as students/groves/turns: service role only, RLS on with no
-- policies, so no client can read or write this directly.
alter table public.feedback enable row level security;
