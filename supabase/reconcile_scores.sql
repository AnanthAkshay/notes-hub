-- ==============================================================================
-- NOTES HUB: SCORE DIAGNOSTIC & ONE-TIME RECONCILIATION SCRIPT
-- ==============================================================================
-- Step 1: Run the diagnostic query to find any notes whose stored score
--         differs from SUM(votes.value).
-- Step 2: Run the one-time UPDATE to recalculate every note's score from votes.
-- Step 3: Re-run the diagnostic query to confirm 0 mismatched rows remain.
-- ==============================================================================

-- 1. DIAGNOSTIC QUERY: Compare notes.score with SUM(votes.value)
select
  n.id,
  n.title,
  n.score as stored_score,
  coalesce(sum(v.value), 0)::integer as computed_score,
  n.score - coalesce(sum(v.value), 0)::integer as diff
from public.notes n
left join public.votes v on v.note_id = n.id
group by n.id, n.title, n.score
having n.score is distinct from coalesce(sum(v.value), 0)::integer
order by abs(n.score - coalesce(sum(v.value), 0)) desc, n.created_at desc;

-- 2. ONE-TIME RECALCULATION: Sync every note's score from public.votes
update public.notes n
set score = coalesce(
  (select sum(v.value)::integer from public.votes v where v.note_id = n.id),
  0
);

-- 3. POST-FIX VERIFICATION: Should return 0 rows
select
  n.id,
  n.title,
  n.score as stored_score,
  coalesce(sum(v.value), 0)::integer as computed_score,
  n.score - coalesce(sum(v.value), 0)::integer as diff
from public.notes n
left join public.votes v on v.note_id = n.id
group by n.id, n.title, n.score
having n.score is distinct from coalesce(sum(v.value), 0)::integer;

