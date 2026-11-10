-- ==============================================================================
-- NOTES HUB: PHASE 2 SQL MIGRATION (Auth, Roles & Security)
-- ==============================================================================
-- This script applies Phase 2 security and role constraints:
-- 1. Server-side college email domain enforcement on auth.users signup
-- 2. Trigger preventing users from self-promoting or altering their role
-- 3. RLS update policy restricting profile edits to own row
-- 4. Reusable is_teacher() security function for future verification policies
-- 5. Commented promotion queries for manual teacher assignment
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SERVER-SIDE EMAIL DOMAIN RESTRICTION
-- Rejects any signup whose email does not match the college domain.
-- Matches the VITE_ALLOWED_EMAIL_DOMAIN variable in your .env file.
-- ------------------------------------------------------------------------------
create or replace function public.validate_user_email_domain()
returns trigger
language plpgsql
security definer
as $$
declare
  -- Set your allowed college domain here (e.g. 'msrit.edu')
  allowed_domain text := 'msrit.edu';
  user_email text := lower(new.email);
begin
  if user_email is null or not (user_email like '%@' || allowed_domain) then
    raise exception 'Registration restricted: Only @% email addresses are allowed. (Attempted: %)',
      allowed_domain, coalesce(new.email, 'null');
  end if;
  return new;
end;
$$;

-- Attach trigger to auth.users before insertion
drop trigger if exists enforce_email_domain_on_signup on auth.users;
create trigger enforce_email_domain_on_signup
  before insert on auth.users
  for each row execute function public.validate_user_email_domain();

comment on function public.validate_user_email_domain() is 'Validates that new user emails belong to the approved college domain';

-- ------------------------------------------------------------------------------
-- 2. ROLE TAMPERING PREVENTION TRIGGER
-- Ensures students/users cannot elevate their own role to 'teacher'.
-- When executed by a logged-in user via the API (auth.uid() is present),
-- changing the role column throws an exception.
-- Admin updates via the Supabase SQL editor run with auth.uid() IS NULL and succeed.
-- ------------------------------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
as $$
begin
  -- If invoked from client request context where auth.uid() is set
  if auth.uid() is not null and old.role is distinct from new.role then
    raise exception 'Security violation: Users are not permitted to change their own role.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_tampering on public.profiles;
create trigger prevent_role_tampering
  before update on public.profiles
  for each row execute function public.protect_profile_role();

comment on function public.protect_profile_role() is 'Prevents client-side users from modifying their assigned role';

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES ON PROFILES
-- Any logged in user (and visitors on public feed) can read profiles.
-- A user can update only their own profile row (e.g. full_name).
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Read policy: Anyone can read profiles (needed for author display on notes)
drop policy if exists "Allow public read access to profiles" on public.profiles;
drop policy if exists "Allow authenticated users to read profiles" on public.profiles;
create policy "Allow authenticated users to read profiles"
  on public.profiles
  for select
  using (true);

-- Update policy: Users can only update their own profile row
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 4. REUSABLE HELPER FUNCTION: is_teacher()
-- Checks if the currently authenticated user has the 'teacher' role.
-- Used by later phases for verification permissions and teacher-only policies.
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
      and role = 'teacher'
  );
$$;

comment on function public.is_teacher() is 'Returns true if current session user is an authorized teacher';

-- ------------------------------------------------------------------------------
-- 5. MANUAL TEACHER PROMOTION (EXAMPLE QUERY)
-- Run this in the Supabase SQL editor to promote a verified faculty member:
-- ------------------------------------------------------------------------------
-- UPDATE public.profiles
-- SET role = 'teacher'
-- WHERE email = 'teacher@msrit.edu';
--
-- To verify the promotion:
-- SELECT id, email, full_name, role FROM public.profiles WHERE role = 'teacher';

