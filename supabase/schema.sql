-- ==============================================================================
-- NOTES HUB: DATABASE SCHEMA (Phase 1)
-- ==============================================================================
-- This script initializes the data model for Notes Hub:
-- 1. Profiles table (synced with Supabase Auth)
-- 2. Notes table (with verification and score metadata)
-- 3. Votes table (with 1-vote-per-user constraint)
-- 4. Optimized indexes for sorting (verified, score, date) and filtering (subject, sem)
-- 5. Trigger to automatically provision profiles on user signup
-- 6. Row Level Security (RLS) with safe placeholder read policies
-- ==============================================================================

-- Enable UUID generation extension if not already enabled
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- Stores public user profiles for both students and teachers, tied to auth.users.
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.profiles is 'User profiles for students and teachers linked to auth.users';
comment on column public.profiles.role is 'Role flag: student or teacher';

-- ------------------------------------------------------------------------------
-- 2. NOTES TABLE
-- Core study materials uploaded by students, ranked by verification status and score.
-- ------------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  semester text not null,
  description text,
  file_url text not null,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0,
  verified boolean not null default false,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.notes is 'Uploaded notes with ranking score and teacher verification';
comment on column public.notes.score is 'Net voting score (upvotes minus downvotes)';
comment on column public.notes.verified is 'True if verified by a teacher';

-- ------------------------------------------------------------------------------
-- 3. VOTES TABLE
-- Tracks student upvotes (+1) and downvotes (-1), enforcing one vote per user per note.
-- ------------------------------------------------------------------------------
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (1, -1)),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_note_user_vote unique (note_id, user_id)
);

comment on table public.votes is 'Upvotes and downvotes cast by users on notes';
comment on column public.votes.value is '+1 for upvote, -1 for downvote';

-- ------------------------------------------------------------------------------
-- 4. INDEXES
-- Designed for fast ranking and search queries:
-- Priority: teacher-verified first, then highest score, then newest
-- ------------------------------------------------------------------------------

-- Primary ranking index for notes feed
create index if not exists idx_notes_ranking
  on public.notes (verified desc, score desc, created_at desc);

-- Filtering indexes by subject and semester
create index if not exists idx_notes_subject
  on public.notes (subject);

create index if not exists idx_notes_semester
  on public.notes (semester);

create index if not exists idx_notes_subject_semester
  on public.notes (subject, semester);

-- Foreign key lookup indexes
create index if not exists idx_notes_uploaded_by
  on public.notes (uploaded_by);

create index if not exists idx_notes_verified_by
  on public.notes (verified_by);

create index if not exists idx_votes_note_id
  on public.votes (note_id);

create index if not exists idx_votes_user_id
  on public.votes (user_id);

-- ------------------------------------------------------------------------------
-- 5. AUTOMATIC PROFILE CREATION TRIGGER
-- Whenever a user signs up via Supabase Auth, automatically insert a row in public.profiles.
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop trigger if already existing to allow re-running schema cleanly
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) & SAFE READ POLICIES
-- Read access is enabled for everyone (students, teachers, visitors).
-- Write policies (insert, update, delete) will be added in subsequent phases.
-- ------------------------------------------------------------------------------

-- Enable RLS on all three tables
alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.votes enable row level security;

-- Safe placeholder read policies
drop policy if exists "Allow public read access to profiles" on public.profiles;
create policy "Allow public read access to profiles"
  on public.profiles
  for select
  using (true);

drop policy if exists "Allow public read access to notes" on public.notes;
create policy "Allow public read access to notes"
  on public.notes
  for select
  using (true);

drop policy if exists "Allow public read access to votes" on public.votes;
create policy "Allow public read access to votes"
  on public.votes
  for select
  using (true);

