-- Build 1: accounts. Adds sign-in identity to students, drops legacy columns.
-- Applied with Supabase:apply_migration. Safe to run once; every statement is
-- guarded so a re-run is a no-op.

-- students: who can sign in as this student, and how.
alter table public.students
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null,
  add column if not exists username     text unique,
  add column if not exists email        text,
  add column if not exists role         text not null default 'student',
  add column if not exists created_at   timestamptz not null default now();

alter table public.students drop column if exists google_email;

-- Existing beta rows: username defaults to the student id so a person who
-- signs up with their old name claims their groves automatically.
update public.students set username = student_id where username is null;

-- The admin role is a value on the student row, not a separate table.
update public.students set role = 'admin' where student_id = 'david';

-- groves: two columns left over from the single-table design, unread since
-- multi-grove shipped.
alter table public.groves drop column if exists child_id;
alter table public.groves drop column if exists profile;

-- The service role is the only reader/writer (RLS on, no policies), so no
-- policy changes are needed for any of the above.
