-- Single-row table backing the admin dashboard's Financials/Settings pages:
-- fixed monthly costs and the break-even price, both editable in Settings.
--
-- NOTE: this migration has already been applied directly to the live
-- Supabase project (xpawazygyvupevgjusyv) via Supabase:apply_migration.
-- It's included here so the schema change is tracked in the repo. Every
-- statement is guarded, so re-applying it is a safe no-op.

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),   -- singleton row
  fixed_costs jsonb not null default '{"supabase": 13, "vercel": 0, "domain": 0}'::jsonb,
  price_per_month numeric not null default 4,
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

alter table public.settings enable row level security;
