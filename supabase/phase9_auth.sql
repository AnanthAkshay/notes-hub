-- ==============================================================================
-- NOTES HUB: PHASE 9 SQL MIGRATION (Roster + Staff Allowlist + Passwordless OTP)
-- ==============================================================================
-- Safe to re-run (idempotent). Configures:
-- 1. student_roster table (RLS enabled, NO browser read/write policies)
-- 2. staff_allowlist table (RLS enabled, NO public policies)
-- 3. profiles.usn column + role constraint supporting ('student','teacher','admin')
--    + non-destructive backfill of usn/full_name from student_roster
-- 4. Updated protect_profile_role(), is_teacher() (teacher|admin), and is_admin()
-- 5. Staff allowlist sync trigger syncing profiles.role on insert/update/delete
-- 6. auth.users BEFORE INSERT gate + updated handle_new_user() trigger
-- 7. check_email_allowed(p_email) RPC (boolean only)
-- 8. Admin-only RPCs: admin_list_staff, admin_add_staff, admin_remove_staff
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. STUDENT ROSTER TABLE (Private; never readable from the browser)
-- ------------------------------------------------------------------------------
create table if not exists public.student_roster (
  usn text primary key check (usn = upper(usn)),
  name text not null,
  email text unique not null check (email = lower(email))
);

comment on table public.student_roster is
  'Private institutional student roster imported from CSV (no public/client access)';

alter table public.student_roster enable row level security;
revoke all on table public.student_roster from public, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. STAFF ALLOWLIST TABLE (Teachers & Admins; managed via admin RPCs / SQL)
-- ------------------------------------------------------------------------------
create table if not exists public.staff_allowlist (
  email text primary key check (email = lower(email)),
  full_name text not null,
  role text not null check (role in ('teacher', 'admin')),
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.staff_allowlist is
  'Allowlist of approved faculty teachers and platform admins';

alter table public.staff_allowlist enable row level security;
revoke all on table public.staff_allowlist from public, anon, authenticated;

-- Normalize email/full_name before insert/update (including manual SQL Editor runs)
create or replace function public.normalize_staff_allowlist_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.email := lower(trim(coalesce(new.email, '')));
  new.full_name := trim(regexp_replace(coalesce(new.full_name, ''), '\s+', ' ', 'g'));

  if new.email = '' or new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid staff email: %', new.email;
  end if;

  if new.full_name = '' then
    raise exception 'Staff full_name cannot be blank.';
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_staff_allowlist_before_write on public.staff_allowlist;
create trigger normalize_staff_allowlist_before_write
  before insert or update on public.staff_allowlist
  for each row execute function public.normalize_staff_allowlist_entry();

-- ------------------------------------------------------------------------------
-- 3. PROFILES SCHEMA UPDATE (Add usn + allow 'admin' role) & SAFE BACKFILL
-- ------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists usn text;

create index if not exists idx_profiles_usn
  on public.profiles (usn)
  where usn is not null;

create index if not exists idx_profiles_email_lower
  on public.profiles (lower(email));

-- Drop existing role CHECK constraint on public.profiles (handles auto-named constraint)
do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', v_constraint_name);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin'));

-- Backfill usn and Title Case full_name for existing profiles matching roster.
-- Intentionally preserves every existing profile's current role.
update public.profiles p
set
  usn = r.usn,
  full_name = case
    when p.full_name is null
      or trim(p.full_name) = ''
      or upper(trim(regexp_replace(p.full_name, '\s+', ' ', 'g'))) = upper(trim(regexp_replace(r.name, '\s+', ' ', 'g')))
    then initcap(trim(regexp_replace(r.name, '\s+', ' ', 'g')))
    else p.full_name
  end
from public.student_roster r
where lower(trim(p.email)) = r.email
  and (
    p.usn is distinct from r.usn
    or p.full_name is null
    or trim(p.full_name) = ''
  );

-- ------------------------------------------------------------------------------
-- 4. ROLE HELPERS & ROLE TAMPERING PROTECTION
-- is_teacher() returns true for both 'teacher' and 'admin'.
-- is_admin() returns true only for 'admin'.
-- ------------------------------------------------------------------------------
create or replace function public.is_teacher()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('teacher', 'admin')
  );
$$;

comment on function public.is_teacher() is
  'Returns true if current session user holds teacher or admin role';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'Returns true if current session user holds the admin role';

-- Allow role mutations only from SQL Editor (auth.uid() IS NULL) or trusted
-- staff_allowlist / handle_new_user sync triggers setting notes_hub.in_staff_sync.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
    and old.role is distinct from new.role
    and current_setting('notes_hub.in_staff_sync', true) is distinct from 'true'
  then
    raise exception 'Security violation: Users are not permitted to change their own role.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_tampering on public.profiles;
create trigger prevent_role_tampering
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ------------------------------------------------------------------------------
-- 5. STAFF ALLOWLIST -> PROFILES ROLE SYNC TRIGGER
-- Automatically updates existing users' role when staff_allowlist changes.
-- Deleting from staff_allowlist reverts the user back to 'student'.
-- ------------------------------------------------------------------------------
create or replace function public.sync_profile_role_from_staff_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('notes_hub.in_staff_sync', 'true', true);

  if tg_op = 'DELETE' then
    update public.profiles
    set role = 'student'
    where lower(trim(email)) = old.email;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.email is distinct from new.email then
    update public.profiles
    set role = 'student'
    where lower(trim(email)) = old.email;
  end if;

  update public.profiles
  set
    role = new.role,
    full_name = coalesce(nullif(trim(new.full_name), ''), full_name)
  where lower(trim(email)) = new.email;

  return new;
end;
$$;

drop trigger if exists on_staff_allowlist_changed on public.staff_allowlist;
create trigger on_staff_allowlist_changed
  after insert or update or delete on public.staff_allowlist
  for each row execute function public.sync_profile_role_from_staff_allowlist();

-- Initial sync for any staff already present in staff_allowlist
do $$
begin
  perform set_config('notes_hub.in_staff_sync', 'true', true);
  update public.profiles p
  set
    role = s.role,
    full_name = coalesce(nullif(trim(s.full_name), ''), p.full_name)
  from public.staff_allowlist s
  where lower(trim(p.email)) = s.email
    and p.role is distinct from s.role;
end $$;

-- ------------------------------------------------------------------------------
-- 6. AUTH.USERS SIGNUP GATE & PROFILE PROVISIONING TRIGGERS
-- Replaces the old domain-only trigger with roster + staff_allowlist enforcement.
-- ------------------------------------------------------------------------------
create or replace function public.validate_user_in_roster_or_staff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
  v_allowed boolean := false;
begin
  if v_email = '' then
    raise exception 'NOT_REGISTERED: A valid registered email address is required.';
  end if;

  select (
    exists (select 1 from public.student_roster where email = v_email)
    or exists (select 1 from public.staff_allowlist where email = v_email)
  ) into v_allowed;

  if not v_allowed then
    raise exception 'NOT_REGISTERED: This email is not in the student roster or staff allowlist. (Attempted: %)',
      v_email;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_email_domain_on_signup on auth.users;
drop trigger if exists enforce_roster_or_staff_on_signup on auth.users;
create trigger enforce_roster_or_staff_on_signup
  before insert on auth.users
  for each row execute function public.validate_user_in_roster_or_staff();

comment on function public.validate_user_in_roster_or_staff() is
  'Blocks signups unless the email exists in student_roster or staff_allowlist';

-- Provision profile with Title Case roster name / staff name, USN, and allowlist role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
  v_staff_name text;
  v_staff_role text;
  v_roster_usn text;
  v_roster_name text;
  v_final_name text;
  v_final_role text;
begin
  select s.full_name, s.role
  into v_staff_name, v_staff_role
  from public.staff_allowlist s
  where s.email = v_email;

  select r.usn, r.name
  into v_roster_usn, v_roster_name
  from public.student_roster r
  where r.email = v_email;

  v_final_role := coalesce(v_staff_role, 'student');
  v_final_name := coalesce(
    nullif(trim(v_staff_name), ''),
    nullif(initcap(trim(regexp_replace(coalesce(v_roster_name, ''), '\s+', ' ', 'g'))), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    ''
  );

  perform set_config('notes_hub.in_staff_sync', 'true', true);

  insert into public.profiles (id, email, full_name, role, usn)
  values (
    new.id,
    v_email,
    v_final_name,
    v_final_role,
    v_roster_usn
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    usn = coalesce(excluded.usn, profiles.usn),
    role = case
      when v_staff_role is not null then v_staff_role
      else profiles.role
    end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 7. PUBLIC RPC: check_email_allowed(p_email)
-- Lightweight, privacy-preserving check returning strictly true or false.
-- ------------------------------------------------------------------------------
create or replace function public.check_email_allowed(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email = '' or length(v_email) > 254 then
    return false;
  end if;

  return (
    exists (select 1 from public.student_roster where email = v_email)
    or exists (select 1 from public.staff_allowlist where email = v_email)
  );
end;
$$;

revoke all on function public.check_email_allowed(text) from public;
grant execute on function public.check_email_allowed(text) to anon, authenticated;

comment on function public.check_email_allowed(text) is
  'Returns true if email is registered in student_roster or staff_allowlist without exposing roster rows';

-- ------------------------------------------------------------------------------
-- 8. ADMIN-ONLY STAFF MANAGEMENT RPCs
-- Strictly enforced in SQL via public.is_admin().
-- ------------------------------------------------------------------------------
create or replace function public.admin_list_staff()
returns table (
  email text,
  full_name text,
  role text,
  added_by uuid,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin privileges required.';
  end if;

  return query
  select
    s.email,
    s.full_name,
    s.role,
    s.added_by,
    s.created_at
  from public.staff_allowlist s
  order by
    case when s.role = 'admin' then 0 else 1 end,
    s.created_at desc,
    s.email asc;
end;
$$;

revoke all on function public.admin_list_staff() from public, anon;
grant execute on function public.admin_list_staff() to authenticated;

create or replace function public.admin_add_staff(
  p_email text,
  p_full_name text,
  p_role text default 'teacher'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_full_name text := trim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  v_role text := lower(trim(coalesce(p_role, 'teacher')));
  v_caller_email text;
  v_saved public.staff_allowlist%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin privileges required.';
  end if;

  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please provide a valid email address.';
  end if;

  if v_full_name = '' then
    raise exception 'Full name is required.';
  end if;

  if v_role not in ('teacher', 'admin') then
    raise exception 'Invalid role: must be "teacher" or "admin".';
  end if;

  select lower(trim(email))
  into v_caller_email
  from public.profiles
  where id = auth.uid();

  if v_email = v_caller_email and v_role <> 'admin' then
    raise exception 'Admins cannot downgrade their own role.';
  end if;

  insert into public.staff_allowlist (email, full_name, role, added_by)
  values (v_email, v_full_name, v_role, auth.uid())
  on conflict (email) do update
  set
    full_name = excluded.full_name,
    role = excluded.role,
    added_by = auth.uid()
  returning * into v_saved;

  return jsonb_build_object(
    'email', v_saved.email,
    'full_name', v_saved.full_name,
    'role', v_saved.role,
    'added_by', v_saved.added_by,
    'created_at', v_saved.created_at
  );
end;
$$;

revoke all on function public.admin_add_staff(text, text, text) from public, anon;
grant execute on function public.admin_add_staff(text, text, text) to authenticated;

create or replace function public.admin_remove_staff(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_caller_email text;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin privileges required.';
  end if;

  if v_email = '' then
    raise exception 'Staff email is required.';
  end if;

  select lower(trim(email))
  into v_caller_email
  from public.profiles
  where id = auth.uid();

  if v_email = v_caller_email or v_email = lower(trim(coalesce(auth.jwt()->>'email', ''))) then
    raise exception 'Admins cannot remove themselves.';
  end if;

  delete from public.staff_allowlist
  where email = v_email;

  if not found then
    raise exception 'Staff entry not found for %', v_email;
  end if;

  return jsonb_build_object(
    'success', true,
    'email', v_email
  );
end;
$$;

revoke all on function public.admin_remove_staff(text) from public, anon;
grant execute on function public.admin_remove_staff(text) to authenticated;

