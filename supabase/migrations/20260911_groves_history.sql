-- Before-image history of every groves row update/delete, so a wipe (the
-- Sep 8 and Sep 11 incidents) can be forensically reconstructed and, if
-- needed, restored by hand.
--
-- NOTE: this migration has already been applied directly to the live
-- Supabase project (xpawazygyvupevgjusyv) via Supabase:apply_migration.
-- It's included here so the schema change is tracked in the repo. Every
-- statement is guarded, so re-applying it is a safe no-op.

create table if not exists public.groves_history (
  id bigint generated always as identity primary key,
  changed_at timestamptz not null default now(),
  op text not null,                         -- 'update' | 'delete'
  grove_id uuid not null,
  student_id text,
  name text,
  concepts jsonb,
  source_id uuid,
  source_start integer,
  source_end integer,
  prev_updated_at timestamptz               -- the row's updated_at just before this change
);

create index if not exists groves_history_grove_idx on public.groves_history (grove_id, changed_at desc);

-- Same pattern as students/groves/turns: service role only, RLS on with no
-- policies, so no client can read or write this directly.
alter table public.groves_history enable row level security;

create or replace function groves_keep_history() returns trigger as $$
begin
  insert into public.groves_history (op, grove_id, student_id, name, concepts, source_id, source_start, source_end, prev_updated_at)
  values (lower(tg_op), old.id, old.student_id, old.name, old.concepts, old.source_id, old.source_start, old.source_end, old.updated_at);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists groves_history_trg on public.groves;
create trigger groves_history_trg before delete or update on public.groves
  for each row execute function groves_keep_history();
