-- ==============================================================================
-- NOTES HUB: PHASE 5 SQL MIGRATION (Teacher Verification System)
-- ==============================================================================
-- This script implements:
-- 1. set_note_verified(p_note_id, p_verified):
--    - Enforces that caller is authenticated and holds the 'teacher' role via is_teacher()
--    - Prevents faculty from self-verifying notes they authored
--    - Updates verified, verified_by, and verified_at atomically
--    - Returns updated verification status and verifier_name
-- 2. Verification field protection:
--    - Direct client updates to notes remain blocked by RLS.
--    - Trigger guard ensures verified fields cannot be altered outside the RPC.
-- 3. notes_feed view:
--    - Exposes note listings joined with uploader details and verifier full_name (no emails).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. VERIFICATION PROTECTION TRIGGER
-- Prevents any client from directly modifying verified, verified_by, or verified_at.
-- Only the set_note_verified RPC sets the internal session flag to permit updates.
-- ------------------------------------------------------------------------------
create or replace function public.protect_note_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If update is attempted by a client (auth.uid() is present)
  -- and verification fields changed without the RPC flag set:
  if auth.uid() is not null and (
    old.verified is distinct from new.verified or
    old.verified_by is distinct from new.verified_by or
    old.verified_at is distinct from new.verified_at
  ) and current_setting('notes_hub.in_verify_rpc', true) is distinct from 'true' then
    raise exception 'Direct modification of verification status is prohibited. Use set_note_verified().';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_note_verification_tampering on public.notes;
create trigger prevent_note_verification_tampering
  before update on public.notes
  for each row execute function public.protect_note_verification_fields();

-- ------------------------------------------------------------------------------
-- 2. RPC FUNCTION: set_note_verified(p_note_id, p_verified)
-- Authenticated teacher verification function (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
create or replace function public.set_note_verified(
  p_note_id uuid,
  p_verified boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_note_uploader uuid;
  v_verifier_name text;
  v_updated_verified boolean;
  v_updated_verified_by uuid;
  v_updated_verified_at timestamptz;
begin
  -- 1. Verify caller is authenticated
  if v_caller_id is null then
    raise exception 'Authentication required to verify notes.';
  end if;

  -- 2. Verify caller has teacher role via is_teacher()
  if not public.is_teacher() then
    raise exception 'Unauthorized: Only faculty accounts with the "teacher" role can verify notes.';
  end if;

  -- 3. Verify note exists and check author
  select uploaded_by into v_note_uploader
  from public.notes
  where id = p_note_id;

  if not found then
    raise exception 'Target note not found (id: %)', p_note_id;
  end if;

  -- 4. Prevent teacher from verifying their own uploaded notes
  if v_note_uploader = v_caller_id then
    raise exception 'Self-verification prohibited: Teachers cannot verify notes they uploaded themselves.';
  end if;

  -- Set session flag to allow update trigger passage
  perform set_config('notes_hub.in_verify_rpc', 'true', true);

  -- 5. Perform verification update
  if p_verified is true then
    update public.notes
    set verified = true,
        verified_by = v_caller_id,
        verified_at = timezone('utc'::text, now())
    where id = p_note_id
    returning verified, verified_by, verified_at
    into v_updated_verified, v_updated_verified_by, v_updated_verified_at;
  else
    update public.notes
    set verified = false,
        verified_by = null,
        verified_at = null
    where id = p_note_id
    returning verified, verified_by, verified_at
    into v_updated_verified, v_updated_verified_by, v_updated_verified_at;
  end if;

  -- 6. Fetch verifier display name (omitting email for privacy)
  if v_updated_verified_by is not null then
    select full_name into v_verifier_name
    from public.profiles
    where id = v_updated_verified_by;
  else
    v_verifier_name := null;
  end if;

  return jsonb_build_object(
    'verified', v_updated_verified,
    'verified_by', v_updated_verified_by,
    'verified_at', v_updated_verified_at,
    'verifier_name', v_verifier_name
  );
end;
$$;

comment on function public.set_note_verified(uuid, boolean) is
  'Sets or revokes teacher verification status on a note with ownership validation';

-- ------------------------------------------------------------------------------
-- 3. VIEW: notes_feed
-- Secure view joining uploader and verifier details without exposing verifier email
-- ------------------------------------------------------------------------------
create or replace view public.notes_feed as
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
  vp.full_name as verifier_name
from public.notes n
left join public.profiles up on n.uploaded_by = up.id
left join public.profiles vp on n.verified_by = vp.id;

-- Enable permissions on view
grant select on public.notes_feed to anon, authenticated;

