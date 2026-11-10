-- ==============================================================================
-- NOTES HUB: DEMO SEED DATA SCRIPT
-- ==============================================================================
-- ⚠️ WARNING: DEMO ONLY — DO NOT RUN IN PRODUCTION!
-- This script creates realistic sample notes across multiple subjects and semesters
-- with varied net scores and faculty verification statuses to showcase the ranking
-- hierarchy (Verified First > Net Score > Newest) immediately upon deployment.
--
-- PREREQUISITES:
-- 1. Create at least one student account (e.g. student1@msrit.edu) via the Login page.
-- 2. Create at least one teacher account (e.g. teacher@msrit.edu) via the Login page.
-- 3. Promote the teacher account in the Supabase SQL Editor:
--      UPDATE public.profiles SET role = 'teacher' WHERE email = 'teacher@msrit.edu';
--
-- TO REMOVE THIS DEMO DATA AFTER YOUR PRESENTATION:
-- Run the following single command in the Supabase SQL Editor:
--      DELETE FROM public.notes WHERE title LIKE '[DEMO]%';
-- (All cascading votes and reports will be deleted automatically).
-- ==============================================================================

do $$
declare
  v_student_id uuid;
  v_teacher_id uuid;
  v_count integer := 0;
begin
  -- 1. Look for existing student and teacher profiles
  select id into v_student_id
  from public.profiles
  where role = 'student'
  order by created_at asc
  limit 1;

  select id into v_teacher_id
  from public.profiles
  where role = 'teacher'
  order by created_at asc
  limit 1;

  -- Fallbacks if role specific accounts are not yet created
  if v_student_id is null then
    select id into v_student_id from public.profiles order by created_at asc limit 1;
  end if;

  if v_teacher_id is null then
    v_teacher_id := v_student_id;
  end if;

  -- Safety check: ensure at least one profile exists in the database
  if v_student_id is null then
    raise exception 'Cannot seed demo notes: No user profiles found in public.profiles. Please sign up at least one user through the Notes Hub web app first!';
  end if;

  -- 2. Clean up any existing demo notes to prevent duplicate rows on re-run
  delete from public.notes where title like '[DEMO]%';

  -- 3. Insert realistic demo study notes
  -- Note 1: Verified Note (Score 18, Sem 5 Computer Networks) -> Demonstrates verified badge
  insert into public.notes (
    title, subject, semester, description, file_url, uploaded_by, score, verified, verified_by, verified_at, created_at
  ) values (
    '[DEMO] Computer Networks: Complete Subnetting & CIDR Cheat Sheet',
    'Computer Networks',
    '5',
    'Handwritten step-by-step CIDR notation calculations, FLSM vs VLSM comparison table, and IPv4/IPv6 packet header breakdown for VTU exams.',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    v_student_id,
    18,
    true,
    v_teacher_id,
    now() - interval '2 days',
    now() - interval '5 days'
  );

  -- Note 2: Verified Note (Score 12, Sem 4 DBMS) -> Demonstrates verified ranking over unverified notes
  insert into public.notes (
    title, subject, semester, description, file_url, uploaded_by, score, verified, verified_by, verified_at, created_at
  ) values (
    '[DEMO] DBMS: Normalization (1NF to BCNF) with Solved University Questions',
    'Database Management Systems',
    '4',
    'Decomposition algorithms, lossy vs lossless join proofs, and dependency preservation tests with 10 past exam numericals solved.',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    v_student_id,
    12,
    true,
    v_teacher_id,
    now() - interval '1 day',
    now() - interval '4 days'
  );

  -- Note 3: High Score Unverified Note (Score 24, Sem 4 Operating Systems)
  -- CRITICAL DEMO ITEM: Proves that verified notes (Notes 1 & 2) rank ABOVE Note 3 even though Note 3 has a higher score (+24 vs +18)!
  insert into public.notes (
    title, subject, semester, description, file_url, uploaded_by, score, verified, verified_by, verified_at, created_at
  ) values (
    '[DEMO] Operating Systems: CPU Scheduling & Deadlock Avoidance (Banker''s Algorithm)',
    'Operating Systems',
    '4',
    'Comprehensive Gantt chart walkthroughs for Round Robin, SJF, and SRTF algorithms plus Banker''s safety test implementation in C.',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    v_student_id,
    24,
    false,
    null,
    null,
    now() - interval '3 days'
  );

  -- Note 4: Moderate Score Unverified Note (Score 9, Sem 6 Machine Learning)
  insert into public.notes (
    title, subject, semester, description, file_url, uploaded_by, score, verified, verified_by, verified_at, created_at
  ) values (
    '[DEMO] Machine Learning: Gradient Descent & Loss Functions Master Notes',
    'Machine Learning',
    '6',
    'Mathematical derivations for Mean Squared Error, Cross-Entropy loss, Adam optimizer mechanics, and learning rate decay schedules.',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    v_student_id,
    9,
    false,
    null,
    null,
    now() - interval '2 days'
  );

  -- Note 5: Lower Score Unverified Note (Score 4, Sem 5 Theory of Computation)
  -- Useful for demonstrating Teacher live verification in the demo: Teacher verifies this and it jumps past Note 3 to the top!
  insert into public.notes (
    title, subject, semester, description, file_url, uploaded_by, score, verified, verified_by, verified_at, created_at
  ) values (
    '[DEMO] Theory of Computation: DFA/NFA Transitions & Pumping Lemma Proofs',
    'Theory of Computation',
    '5',
    'State transition tables, epsilon-NFA to DFA conversion algorithms, and rigorous Pumping Lemma contradiction proofs for non-regular languages.',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    v_student_id,
    4,
    false,
    null,
    null,
    now() - interval '1 day'
  );

  -- Note 6: New Note (Score 2, Sem 3 Data Structures)
  insert into public.notes (
    title, subject, semester, description, file_url, uploaded_by, score, verified, verified_by, verified_at, created_at
  ) values (
    '[DEMO] Data Structures: Dynamic Programming Patterns (0/1 Knapsack, LCS)',
    'Data Structures',
    '3',
    'Clean recurrence relations, tabulation tables, and space-optimized code in C++ for standard university exam patterns.',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    v_student_id,
    2,
    false,
    null,
    null,
    now() - interval '12 hours'
  );

  -- Note 7: Low Score Note (Score -1, Sem 7 Cloud Computing)
  insert into public.notes (
    title, subject, semester, description, file_url, uploaded_by, score, verified, verified_by, verified_at, created_at
  ) values (
    '[DEMO] Cloud Computing: AWS Architecture & IAM Policy Cheat Sheet',
    'Cloud Computing',
    '7',
    'Draft architecture diagrams covering VPC peering, security group configurations, and S3 bucket encryption policies.',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    v_student_id,
    -1,
    false,
    null,
    null,
    now() - interval '6 hours'
  );

  -- Note 8: Incomplete Draft Note with Negative Score (Score -4, Sem 6 Web Tech)
  -- Perfect for demonstrating the "Needs Review" queue (score <= -3 triggers auto needs-review badge) and peer reporting!
  insert into public.notes (
    title, subject, semester, description, file_url, uploaded_by, score, verified, verified_by, verified_at, created_at
  ) values (
    '[DEMO] Web Technologies: React 19 Concurrent Features (Incomplete Notes)',
    'Web Technologies',
    '6',
    'Unfinished lecture notes with syntax errors in server action examples and missing diagram pages. Marked by peers for review.',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    v_student_id,
    -4,
    false,
    null,
    null,
    now() - interval '2 hours'
  );

  select count(*) into v_count from public.notes where title like '[DEMO]%';
  raise notice 'Successfully seeded % demo notes for Notes Hub!', v_count;
end $$;

