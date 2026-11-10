-- ==============================================================================
-- NOTES HUB: PHASE 6 SQL MIGRATION (Deterministic Ranking & Composite Indexes)
-- ==============================================================================
-- This script optimizes the PostgreSQL database for Phase 6 multi-tier sorting:
-- 1. "Top" ranking index: (verified DESC, score DESC, created_at DESC, id DESC)
-- 2. "Most upvoted" ranking index: (score DESC, created_at DESC, id DESC)
-- 3. "Newest" ranking index: (created_at DESC, id DESC)
-- 4. "Verified only" filtering index: (verified)
-- 5. Optional "Hot" decay algorithm view definition
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COMPOSITE INDEXES FOR STABLE DETERMINISTIC ORDERING
-- ------------------------------------------------------------------------------

-- Primary index for "Top" ranking:
-- Teacher-verified first (true > false), then highest net score, then newest,
-- with UUID id DESC as an absolute tie-breaker to prevent pagination jitter/duplicates.
create index if not exists idx_notes_top_ranking
  on public.notes (verified desc, score desc, created_at desc, id desc);

-- Index for "Most upvoted" sort (ignores verified status):
create index if not exists idx_notes_score_ranking
  on public.notes (score desc, created_at desc, id desc);

-- Index for "Newest" sort:
create index if not exists idx_notes_newest_ranking
  on public.notes (created_at desc, id desc);

-- Single-column index for "Verified only" filter:
create index if not exists idx_notes_verified
  on public.notes (verified);

-- Composite filter indexes combining verified with subject/semester:
create index if not exists idx_notes_verified_subject_sem
  on public.notes (verified, subject, semester);

-- ------------------------------------------------------------------------------
-- 2. OPTIONAL BONUS: "HOT" DECAY ALGORITHM VIEW
-- Formula: score / (age_in_days + 2)^1.5
-- Notes: This view is provided as a reference/bonus for calculating decaying popularity.
-- For maximum performance and index-backed range pagination on Supabase Free Tier,
-- the application defaults to the deterministic multi-column B-tree indexes above.
-- ------------------------------------------------------------------------------
create or replace view public.notes_hot_ranking as
select
  n.*,
  round(
    (n.score::numeric / power(greatest(extract(epoch from (now() - n.created_at)) / 86400.0, 0) + 2.0, 1.5))::numeric,
    4
  ) as hot_score
from public.notes n;

grant select on public.notes_hot_ranking to anon, authenticated;

