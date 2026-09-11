-- Multi-format input (Stage 4): PDF/DOCX/TXT/URL sources alongside photos.
-- A grove founded from one of these keeps the full extracted text in
-- `sources` (never a slice, even when a section was picked - so a student
-- can come back and study a different part later) and points to it via
-- groves.source_id; the character range actually used for extraction, if
-- any, is recorded on the grove itself.
--
-- NOTE: this migration has already been applied directly to the live
-- Supabase project (xpawazygyvupevgjusyv) via Supabase:apply_migration.
-- It's included here so the schema change is tracked in the repo. Every
-- statement is guarded, so re-applying it is a safe no-op.

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  student_id text references public.students (student_id) on delete set null,
  filename text,
  kind text not null default 'file',   -- 'pdf' | 'docx' | 'txt' | 'url'
  text text not null,
  char_count int generated always as (length(text)) stored
);

alter table public.groves add column if not exists source_id uuid references public.sources (id);
alter table public.groves add column if not exists source_start int;
alter table public.groves add column if not exists source_end int;

alter table public.sources enable row level security;
