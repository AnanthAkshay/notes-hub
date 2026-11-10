-- ==============================================================================
-- NOTES HUB: PHASE 3 SQL MIGRATION (Notes RLS & Supabase Storage)
-- ==============================================================================
-- This script applies Phase 3 data access rules:
-- 1. Notes table RLS policies:
--    - SELECT: Anyone can read notes (visitors + students + teachers)
--    - INSERT: Only authenticated users can insert, enforcing uploaded_by = auth.uid()
--    - DELETE: Users can delete only their own uploaded notes
--    - UPDATE: Explicitly disabled from the client (voting & verification in Phases 4-5)
-- 2. Storage Bucket setup ("notes-files"):
--    - Public bucket with 10 MB file cap (free-tier safe)
--    - Allowed MIME types: PDF, PNG, JPG/JPEG
-- 3. Storage Object RLS policies:
--    - SELECT: Anyone can read/download notes files
--    - INSERT: Authenticated users can upload only into their own user_id folder
--    - DELETE: Authenticated users can delete only their own files
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ROW LEVEL SECURITY (RLS) FOR NOTES TABLE
-- ------------------------------------------------------------------------------
alter table public.notes enable row level security;

-- Read policy: Anyone can browse notes
drop policy if exists "Allow public read access to notes" on public.notes;
drop policy if exists "Anyone can read notes" on public.notes;
create policy "Anyone can read notes"
  on public.notes
  for select
  using (true);

-- Insert policy: Logged-in users can insert notes, forcing uploaded_by to match auth.uid()
drop policy if exists "Authenticated users can insert their own notes" on public.notes;
create policy "Authenticated users can insert their own notes"
  on public.notes
  for insert
  to authenticated
  with check (auth.uid() = uploaded_by);

-- Delete policy: Users can delete only their own notes
drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
  on public.notes
  for delete
  to authenticated
  using (auth.uid() = uploaded_by);

-- Explicitly ensure client UPDATE policies do not exist yet (prevents score/verified tampering)
drop policy if exists "Allow update to notes" on public.notes;
drop policy if exists "Users can update their own notes" on public.notes;

-- ------------------------------------------------------------------------------
-- 2. SUPABASE STORAGE BUCKET: "notes-files"
-- Configures a public bucket with 10 MB per-file limit and MIME type filter
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notes-files',
  'notes-files',
  true,
  10485760, -- 10 MB maximum size per file (free tier protection)
  array['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

-- ------------------------------------------------------------------------------
-- 3. STORAGE OBJECTS ROW LEVEL SECURITY (RLS)
-- Path format: <user_id>/<timestamp>-<sanitized_filename>
-- ------------------------------------------------------------------------------

-- Public read access for notes files
drop policy if exists "Anyone can read notes-files" on storage.objects;
create policy "Anyone can read notes-files"
  on storage.objects
  for select
  using (bucket_id = 'notes-files');

-- Upload access: Logged-in users can upload ONLY into a folder named after their own auth.uid()
drop policy if exists "Authenticated users can upload note files" on storage.objects;
create policy "Authenticated users can upload note files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'notes-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete access: Users can delete only their own files
drop policy if exists "Users can delete their own note files" on storage.objects;
create policy "Users can delete their own note files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'notes-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

