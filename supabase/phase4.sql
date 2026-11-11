-- ==============================================================================
-- NOTES HUB: PHASE 4 SQL MIGRATION (Tamper-Proof Voting System)
-- ==============================================================================
-- This script configures:
-- 1. Strict RLS on the votes table (users can only read and modify their own votes).
-- 2. Automatic trigger (SECURITY DEFINER) maintaining notes.score on any vote mutation.
-- 3. cast_vote(p_note_id, p_value) RPC function handling atomic vote creation,
--    toggle-off, switching, and blocking self-voting on owned notes.
-- 4. Initial reconciliation query updating all existing notes' scores.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ROW LEVEL SECURITY (RLS) FOR VOTES TABLE
-- ------------------------------------------------------------------------------
alter table public.votes enable row level security;

-- Drop prior placeholder read policy from Phase 1
drop policy if exists "Allow public read access to votes" on public.votes;
drop policy if exists "Users can view only their own votes" on public.votes;

-- A logged-in user can SELECT only their own cast votes
create policy "Users can view only their own votes"
  on public.votes
  for select
  to authenticated
  using (auth.uid() = user_id);

-- A user can INSERT only rows where user_id matches their own auth.uid()
drop policy if exists "Users can insert their own votes" on public.votes;
create policy "Users can insert their own votes"
  on public.votes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- A user can UPDATE only their own votes
drop policy if exists "Users can update their own votes" on public.votes;
create policy "Users can update their own votes"
  on public.votes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A user can DELETE only their own votes
drop policy if exists "Users can delete their own votes" on public.votes;
create policy "Users can delete their own votes"
  on public.votes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Ensure client updates directly to notes.score remain completely blocked
drop policy if exists "Allow update to notes" on public.notes;
drop policy if exists "Users can update their own notes" on public.notes;

-- ------------------------------------------------------------------------------
-- 2. TRIGGER FUNCTION: AUTOMATIC SCORE AGGREGATION
-- Automatically recalculates notes.score whenever a vote is inserted, updated,
-- or deleted. Runs with SECURITY DEFINER and search_path=public to protect integrity.
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

  -- Atomically calculate sum of votes for target note
  update public.notes
  set score = coalesce(
    (select sum(value) from public.votes where note_id = target_note_id),
    0
  )
  where id = target_note_id;

  -- Handle rare case if a vote's note_id was modified
  if tg_op = 'UPDATE' and old.note_id is distinct from new.note_id then
    update public.notes
    set score = coalesce(
      (select sum(value) from public.votes where note_id = old.note_id),
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

comment on function public.update_note_score_on_vote() is
  'Maintains tamper-proof net score on notes table automatically whenever votes change';

-- ------------------------------------------------------------------------------
-- 3. RPC FUNCTION: cast_vote(p_note_id, p_value)
-- Handles all atomic voting business logic:
-- - Validates active authentication
-- - Validates vote value (+1 or -1)
-- - Blocks students/teachers from voting on notes they uploaded
-- - Toggles vote off if clicked same direction
-- - Switches vote if clicked opposite direction (+1 <-> -1)
-- - Returns updated score and my_vote (1, -1, or 0)
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
  v_new_score int;
begin
  -- 1. Authenticate caller
  if v_user_id is null then
    raise exception 'Authentication required to vote.';
  end if;

  -- 2. Validate vote direction
  if p_value not in (1, -1) then
    raise exception 'Invalid vote value: must be 1 (upvote) or -1 (downvote).';
  end if;

  -- 3. Lock note row, check note existence & block author self-voting
  select uploaded_by into v_note_uploader
  from public.notes
  where id = p_note_id
  for update;

  if not found then
    raise exception 'Target note does not exist (id: %)', p_note_id;
  end if;

  if v_note_uploader = v_user_id then
    raise exception 'Self-voting prohibited: Users cannot vote on their own notes.';
  end if;

  -- 4. Check existing vote for (p_note_id, v_user_id)
  select value into v_current_vote
  from public.votes
  where note_id = p_note_id and user_id = v_user_id;

  if v_current_vote is null then
    -- Case A: New vote cast
    insert into public.votes (note_id, user_id, value)
    values (p_note_id, v_user_id, p_value);
    v_final_vote := p_value;
  elsif v_current_vote = p_value then
    -- Case B: Clicked same direction again -> Toggle off (remove vote)
    delete from public.votes
    where note_id = p_note_id and user_id = v_user_id;
    v_final_vote := 0;
  else
    -- Case C: Clicked opposite direction -> Switch vote
    update public.votes
    set value = p_value, created_at = timezone('utc'::text, now())
    where note_id = p_note_id and user_id = v_user_id;
    v_final_vote := p_value;
  end if;

  -- The on_vote_changed trigger has automatically synced public.notes.score.
  -- Fetch the freshly updated score
  select score into v_new_score
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
  'Safely casts, switches, or toggles upvotes/downvotes, returning updated score';

-- ------------------------------------------------------------------------------
-- 4. ONE-TIME RECONCILIATION QUERY
-- Recalculates every existing note score from existing votes table to prevent drift
-- ------------------------------------------------------------------------------
update public.notes n
set score = coalesce(
  (select sum(value) from public.votes v where v.note_id = n.id),
  0
);

