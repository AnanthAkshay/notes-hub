-- ==============================================================================
-- NOTES HUB: PHASE 7 SQL MIGRATION (Reporting & Moderation System)
-- ==============================================================================
-- This script configures:
-- 1. "reports" table with unique constraint (1 report per user per note)
-- 2. Strict RLS ensuring students can only insert & view their own reports
-- 3. Teachers-only access to view all reports, resolve reports, and delete notes
-- 4. Automatic "needs_review" logic with configurable thresholds (3+ reports or score <= -3)
-- 5. RPC functions: resolve_report, dismiss_reports_for_note, teacher_delete_note, get_open_reports_count
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REPORTS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('incorrect', 'incomplete', 'duplicate', 'inappropriate', 'other')),
  details text check (details is null or length(details) <= 300),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  constraint unique_note_reporter unique (note_id, reported_by)
);

comment on table public.reports is 'Peer reports regarding accuracy, completeness, or policy adherence';
comment on column public.reports.status is 'open or resolved';

-- Indexes for fast moderation lookups
create index if not exists idx_reports_note_status on public.reports (note_id, status);
create index if not exists idx_reports_reported_by on public.reports (reported_by);
create index if not exists idx_reports_status on public.reports (status);

-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) FOR REPORTS
-- Reporter identities and report contents are strictly hidden from students/public.
-- ------------------------------------------------------------------------------
alter table public.reports enable row level security;

-- INSERT Policy: Authenticated users can insert reports only as themselves
-- and are prohibited from reporting notes they uploaded.
drop policy if exists "Authenticated users can submit reports" on public.reports;
create policy "Authenticated users can submit reports"
  on public.reports
  for insert
  to authenticated
  with check (
    auth.uid() = reported_by
    and not exists (
      select 1 from public.notes
      where id = note_id and uploaded_by = auth.uid()
    )
  );

-- SELECT Policy: Users can select ONLY their own reports.
-- Teachers can select ALL reports for moderation review.
drop policy if exists "Users see own reports and teachers see all" on public.reports;
create policy "Users see own reports and teachers see all"
  on public.reports
  for select
  to authenticated
  using (
    auth.uid() = reported_by
    or public.is_teacher()
  );

-- Direct client updates/deletes to reports are completely blocked
drop policy if exists "Direct update to reports prohibited" on public.reports;
drop policy if exists "Direct delete of reports prohibited" on public.reports;

-- Prevent self-reporting trigger with descriptive exception
create or replace function public.validate_report_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note_uploader uuid;
begin
  select uploaded_by into v_note_uploader
  from public.notes
  where id = new.note_id;

  if v_note_uploader = new.reported_by then
    raise exception 'Self-reporting prohibited: Users cannot report their own notes.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_self_reporting on public.reports;
create trigger prevent_self_reporting
  before insert on public.reports
  for each row execute function public.validate_report_submission();

-- ------------------------------------------------------------------------------
-- 3. RPC FUNCTIONS FOR FACULTY MODERATION
-- ------------------------------------------------------------------------------

-- Resolve a single report
create or replace function public.resolve_report(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    raise exception 'Unauthorized: Only faculty accounts can resolve reports.';
  end if;

  update public.reports
  set status = 'resolved',
      resolved_by = auth.uid(),
      resolved_at = timezone('utc'::text, now())
  where id = p_report_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Dismiss (resolve) all open reports for a note
create or replace function public.dismiss_reports_for_note(p_note_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_teacher() then
    raise exception 'Unauthorized: Only faculty accounts can dismiss reports.';
  end if;

  update public.reports
  set status = 'resolved',
      resolved_by = auth.uid(),
      resolved_at = timezone('utc'::text, now())
  where note_id = p_note_id and status = 'open';

  get diagnostics v_count = row_count;

  return jsonb_build_object('success', true, 'resolved_count', v_count);
end;
$$;

-- Teacher note deletion (cascades to votes, reports; returns file_url for storage cleanup)
create or replace function public.teacher_delete_note(p_note_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_file_url text;
begin
  if not public.is_teacher() then
    raise exception 'Unauthorized: Only faculty accounts can delete moderated notes.';
  end if;

  select file_url into v_file_url
  from public.notes
  where id = p_note_id;

  if not found then
    raise exception 'Target note not found (id: %)', p_note_id;
  end if;

  delete from public.notes
  where id = p_note_id;

  return jsonb_build_object(
    'success', true,
    'deleted_note_id', p_note_id,
    'file_url', v_file_url
  );
end;
$$;

-- Count of notes with pending open reports for the teacher's Navbar badge
create or replace function public.get_open_reports_count()
returns int
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_count int := 0;
begin
  if not public.is_teacher() then
    return 0;
  end if;

  select count(distinct note_id) into v_count
  from public.reports
  where status = 'open';

  return coalesce(v_count, 0);
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. VIEW: notes_reported_queue ("Needs Review" Thresholds)
-- Configurable thresholds defined here:
-- - REPORT_THRESHOLD: 3 or more open reports
-- - SCORE_THRESHOLD: score <= -3
-- ------------------------------------------------------------------------------
create or replace view public.notes_reported_queue as
with report_summary as (
  select
    note_id,
    count(*) filter (where status = 'open') as open_report_count,
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'reason', reason,
        'details', details,
        'created_at', created_at
      )
    ) filter (where status = 'open') as open_reports
  from public.reports
  group by note_id
)
select
  n.id,
  n.title,
  n.subject,
  n.semester,
  n.description,
  n.file_url,
  n.score,
  n.verified,
  n.verified_by,
  n.verified_at,
  n.created_at,
  n.uploaded_by,
  up.full_name as uploader_name,
  up.role as uploader_role,
  coalesce(rs.open_report_count, 0) as open_report_count,
  coalesce(rs.open_reports, '[]'::jsonb) as open_reports,
  -- THRESHOLDS: 3+ open reports OR net score <= -3 triggers "needs_review"
  (coalesce(rs.open_report_count, 0) >= 3 or n.score <= -3) as needs_review
from public.notes n
left join public.profiles up on n.uploaded_by = up.id
left join report_summary rs on n.id = rs.note_id
where (coalesce(rs.open_report_count, 0) > 0 or n.score <= -3)
order by
  (coalesce(rs.open_report_count, 0) >= 3 or n.score <= -3) desc,
  coalesce(rs.open_report_count, 0) desc,
  n.created_at desc;

grant select on public.notes_reported_queue to authenticated;

