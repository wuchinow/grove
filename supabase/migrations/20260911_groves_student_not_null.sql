-- Records the NOT NULL constraint on groves.student_id in the repo. Already
-- applied to the live database directly via chat and the Supabase MCP (see
-- the roadmap's Housekeeping section); this file is the repo record, guarded
-- so re-running it (or applying it fresh to a new environment) is a no-op
-- when the constraint is already set.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'groves'
      and column_name = 'student_id' and is_nullable = 'NO'
  ) then
    alter table public.groves alter column student_id set not null;
  end if;
end $$;
