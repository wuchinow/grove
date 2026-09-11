-- Prompt-cache token columns on turns, so the admin usage/cost dashboard can
-- price cache reads and cache writes instead of only full-price input/output.
--
-- NOTE: this migration has already been applied directly to the live
-- Supabase project (xpawazygyvupevgjusyv) via Supabase:apply_migration.
-- It's included here so the schema change is tracked in the repo. Every
-- statement is guarded, so re-applying it is a safe no-op.

alter table public.turns add column if not exists cache_read_input_tokens integer not null default 0;
alter table public.turns add column if not exists cache_creation_input_tokens integer not null default 0;
