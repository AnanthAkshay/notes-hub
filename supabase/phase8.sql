-- ==============================================================================
-- NOTES HUB: PHASE 8 SQL MIGRATION (Vote Concurrency Fix + Fast Single-Trip Feed)
-- ==============================================================================
-- Idempotent migration applying:
-- 1. Self-healing recount trigger (the ONLY mechanism modifying notes.score)
-- 2. Row-locked cast_vote(p_note_id, p_value) RPC returning (score, my_vote)
-- 3. Composite & trigram indexes for fast feed filtering, sorting, and vote joins
-- 4. Single-round-trip get_notes_feed(p_filters, p_sort, p_limit, p_offset) RPC
-- 5. One-time reconciliation recalculating every note's score from public.votes
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SELF-HEALING SCORE RECOUNT TRIGGER (Single Mechanism for notes.score)
-- Recounts score = COALESCE(SUM(value), 0) on every vote INSERT/UPDATE/DELETE.
-- ------------------------------------------------------------------------------
create or replace function public.update_note_score_on_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_note_id uuid;
begin
  if tg_op = 'DELETE' then
    target_note_id := old.note_id;
  else
    target_note_id := new.note_id;
  end if;

  update public.notes
  set score = coalesce(
    (select sum(value)::integer from public.votes where note_id = target_note_id),
    0
  )
  where id = target_note_id;

  if tg_op = 'UPDATE' and old.note_id is distinct from new.note_id then
    update public.notes
    set score = coalesce(
      (select sum(value)::integer from public.votes where note_id = old.note_id),
      0
    )
    where id = old.note_id;
  end if;

  return null;
end;
$$;

drop trigger if exists on_vote_changed on public.votes;
create trigger on_vote_changed
  after insert or update or delete on public.votes
  for each row execute function public.update_note_score_on_vote();

-- ------------------------------------------------------------------------------
-- 2. ROW-LOCKED ATOMIC cast_vote(p_note_id, p_value)
-- Acquires FOR UPDATE lock on the target notes row so concurrent calls serialize.
-- Never mutates notes.score directly; lets on_vote_changed recount atomically.
-- Returns JSONB: { "score": <int>, "my_vote": <-1 | 0 | 1> }
-- ------------------------------------------------------------------------------
create or replace function public.cast_vote(
  p_note_id uuid,
  p_value smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_note_uploader uuid;
  v_current_vote smallint;
  v_final_vote smallint := 0;
  v_new_score integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required to vote.';
  end if;

  if p_value not in (1, -1) then
    raise exception 'Invalid vote value: must be 1 (upvote) or -1 (downvote).';
  end if;

  -- Lock the note row so concurrent votes (same user or different users) serialize
  select uploaded_by
  into v_note_uploader
  from public.notes
  where id = p_note_id
  for update;

  if not found then
    raise exception 'Target note does not exist (id: %)', p_note_id;
  end if;

  if v_note_uploader = v_user_id then
    raise exception 'Self-voting prohibited: Users cannot vote on their own notes.';
  end if;

  select value
  into v_current_vote
  from public.votes
  where note_id = p_note_id
    and user_id = v_user_id;

  if v_current_vote is null then
    insert into public.votes (note_id, user_id, value)
    values (p_note_id, v_user_id, p_value);
    v_final_vote := p_value;
  elsif v_current_vote = p_value then
    delete from public.votes
    where note_id = p_note_id
      and user_id = v_user_id;
    v_final_vote := 0;
  else
    update public.votes
    set value = p_value,
        created_at = timezone('utc'::text, now())
    where note_id = p_note_id
      and user_id = v_user_id;
    v_final_vote := p_value;
  end if;

  -- Read authoritative score recounted by the on_vote_changed trigger
  select score
  into v_new_score
  from public.notes
  where id = p_note_id;

  return jsonb_build_object(
    'score', coalesce(v_new_score, 0),
    'my_vote', v_final_vote
  );
end;
$$;

revoke all on function public.cast_vote(uuid, smallint) from public;
grant execute on function public.cast_vote(uuid, smallint) to authenticated;

comment on function public.cast_vote(uuid, smallint) is
  'Serializes per-note votes via FOR UPDATE, delegates score recount to trigger, and returns {score, my_vote}';

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR FAST FEED QUERIES, TEXT SEARCH, AND USER VOTE JOINS
-- ------------------------------------------------------------------------------
create extension if not exists pg_trgm;

-- Partial index for verified-only top feed (Home "Top Verified" & Verified filter)
create index if not exists idx_notes_verified_top_ranking
  on public.notes (score desc, created_at desc, id desc)
  where verified = true;

-- Composite index for subject-filtered top ranking
create index if not exists idx_notes_subject_top_ranking
  on public.notes (subject, verified desc, score desc, created_at desc, id desc);

-- Trigram GIN index for fast ILIKE title search
create index if not exists idx_notes_title_trgm
  on public.notes using gin (title gin_trgm_ops);

-- Covering index for single-trip user vote lookup in get_notes_feed
create index if not exists idx_votes_user_note_value
  on public.votes (user_id, note_id) include (value);

-- ------------------------------------------------------------------------------
-- 4. SINGLE-ROUND-TRIP FEED RPC: get_notes_feed(p_filters, p_sort, p_limit, p_offset)
-- Security invoker keeps RLS intact (votes RLS restricts uv to auth.uid()).
-- Returns only the columns required by feed cards + uploader_name, verifier_name,
-- my_vote, and total_count. Ordering uses verified > score > newest + id tiebreak.
-- ------------------------------------------------------------------------------
create or replace function public.get_notes_feed(
  p_filters jsonb default '{}'::jsonb,
  p_sort text default 'top',
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  subject text,
  semester text,
  file_url text,
  uploaded_by uuid,
  score integer,
  verified boolean,
  verified_by uuid,
  created_at timestamptz,
  uploader_name text,
  verifier_name text,
  my_vote smallint,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_subject text := nullif(trim(coalesce(p_filters->>'subject', '')), '');
  v_semester text := nullif(trim(coalesce(p_filters->>'semester', '')), '');
  v_semester_num text := null;
  v_verified_only boolean := coalesce(nullif(trim(p_filters->>'verified_only'), '')::boolean, false);
  v_search_raw text := nullif(trim(coalesce(p_filters->>'search', '')), '');
  v_search_pattern text := null;
  v_sort text := coalesce(nullif(trim(p_sort), ''), 'top');
  v_limit integer := least(greatest(coalesce(p_limit, 12), 1), 50);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_uid uuid := auth.uid();
begin
  if v_semester is not null then
    v_semester_num := nullif(regexp_replace(v_semester, '^Semester\s+', '', 'i'), '');
  end if;

  if v_search_raw is not null then
    v_search_pattern := '%' || replace(replace(replace(v_search_raw, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  if v_sort = 'upvoted' then
    return query
    select
      n.id,
      n.title,
      n.subject,
      n.semester,
      n.file_url,
      n.uploaded_by,
      n.score,
      n.verified,
      n.verified_by,
      n.created_at,
      coalesce(nullif(up.full_name, ''), nullif(split_part(up.email, '@', 1), ''), 'Student') as uploader_name,
      case
        when n.verified then coalesce(nullif(vp.full_name, ''), nullif(split_part(vp.email, '@', 1), ''), 'Faculty')
        else null
      end as verifier_name,
      coalesce(uv.value, 0)::smallint as my_vote,
      count(*) over()::bigint as total_count
    from public.notes n
    left join public.profiles up on up.id = n.uploaded_by
    left join public.profiles vp on vp.id = n.verified_by
    left join public.votes uv on uv.note_id = n.id and uv.user_id = v_uid
    where (v_subject is null or n.subject = v_subject)
      and (
        v_semester is null
        or n.semester = v_semester
        or (v_semester_num is not null and (n.semester = v_semester_num or n.semester = 'Semester ' || v_semester_num))
      )
      and (not v_verified_only or n.verified = true)
      and (v_search_pattern is null or n.title ilike v_search_pattern escape '\')
    order by n.score desc, n.verified desc, n.created_at desc, n.id desc
    limit v_limit offset v_offset;
  elsif v_sort = 'newest' then
    return query
    select
      n.id,
      n.title,
      n.subject,
      n.semester,
      n.file_url,
      n.uploaded_by,
      n.score,
      n.verified,
      n.verified_by,
      n.created_at,
      coalesce(nullif(up.full_name, ''), nullif(split_part(up.email, '@', 1), ''), 'Student') as uploader_name,
      case
        when n.verified then coalesce(nullif(vp.full_name, ''), nullif(split_part(vp.email, '@', 1), ''), 'Faculty')
        else null
      end as verifier_name,
      coalesce(uv.value, 0)::smallint as my_vote,
      count(*) over()::bigint as total_count
    from public.notes n
    left join public.profiles up on up.id = n.uploaded_by
    left join public.profiles vp on vp.id = n.verified_by
    left join public.votes uv on uv.note_id = n.id and uv.user_id = v_uid
    where (v_subject is null or n.subject = v_subject)
      and (
        v_semester is null
        or n.semester = v_semester
        or (v_semester_num is not null and (n.semester = v_semester_num or n.semester = 'Semester ' || v_semester_num))
      )
      and (not v_verified_only or n.verified = true)
      and (v_search_pattern is null or n.title ilike v_search_pattern escape '\')
    order by n.created_at desc, n.id desc
    limit v_limit offset v_offset;
  else
    -- Default 'top': verified > score > newest with stable id tiebreak
    return query
    select
      n.id,
      n.title,
      n.subject,
      n.semester,
      n.file_url,
      n.uploaded_by,
      n.score,
      n.verified,
      n.verified_by,
      n.created_at,
      coalesce(nullif(up.full_name, ''), nullif(split_part(up.email, '@', 1), ''), 'Student') as uploader_name,
      case
        when n.verified then coalesce(nullif(vp.full_name, ''), nullif(split_part(vp.email, '@', 1), ''), 'Faculty')
        else null
      end as verifier_name,
      coalesce(uv.value, 0)::smallint as my_vote,
      count(*) over()::bigint as total_count
    from public.notes n
    left join public.profiles up on up.id = n.uploaded_by
    left join public.profiles vp on vp.id = n.verified_by
    left join public.votes uv on uv.note_id = n.id and uv.user_id = v_uid
    where (v_subject is null or n.subject = v_subject)
      and (
        v_semester is null
        or n.semester = v_semester
        or (v_semester_num is not null and (n.semester = v_semester_num or n.semester = 'Semester ' || v_semester_num))
      )
      and (not v_verified_only or n.verified = true)
      and (v_search_pattern is null or n.title ilike v_search_pattern escape '\')
    order by n.verified desc, n.score desc, n.created_at desc, n.id desc
    limit v_limit offset v_offset;
  end if;
end;
$$;

grant execute on function public.get_notes_feed(jsonb, text, integer, integer) to anon, authenticated;

comment on function public.get_notes_feed(jsonb, text, integer, integer) is
  'Returns paginated notes feed with uploader name, verifier name, current user vote, and total count in one RLS-safe round trip';

-- ------------------------------------------------------------------------------
-- 5. ONE-TIME SCORE RECONCILIATION
-- Recalculates every note score from public.votes so there are zero mismatches.
-- ------------------------------------------------------------------------------
update public.notes n
set score = coalesce(
  (select sum(v.value)::integer from public.votes v where v.note_id = n.id),
  0
);

