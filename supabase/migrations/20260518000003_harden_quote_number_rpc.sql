-- Hardens get_next_quote_number() to close both cross-user attack paths
-- documented in SECURITY-AUDIT.MD (Finding 1, Severity: High).
--
-- Root cause
-- ----------
-- The previous implementation (migration 20260518000002) was declared
-- SECURITY DEFINER and authorised callers using a caller-supplied p_user_id
-- parameter.  Because the function lived in the exposed public schema with no
-- REVOKE on execute rights, any authenticated user could call it directly via
-- the Supabase REST API with an arbitrary payload:
--
--   Exploit A — existence oracle
--     Calling with p_user_id = own_id but p_job_site_id = victim_uuid returned
--     "Access denied" (vs "Job site not found" for a truly absent UUID),
--     confirming the victim UUID existed and belonged to a real tenant.
--
--   Exploit B — quote-metadata disclosure
--     Calling with p_user_id = victim_user_id and p_job_site_id = victim_site_id
--     made both sides of the ownership check equal, so the function returned
--     the victim's next quote number (e.g. "AC-007"), leaking client initials
--     and quote count.
--
-- Fixes applied
-- -------------
--   1. Drop the old (p_job_site_id UUID, p_user_id UUID) overload entirely.
--      CREATE OR REPLACE cannot swap a function's parameter list, so an
--      explicit DROP is required before the replacement can be created.
--
--   2. Rebuild with a single (p_job_site_id UUID) parameter.
--      The caller identity is now derived exclusively from auth.uid(), which
--      PostgREST sets from the request JWT before each call.  The value cannot
--      be supplied or overridden by the caller — closing Exploit B.
--
--   3. Return a single opaque "Not found" error for both "row doesn't exist"
--      and "row belongs to another user".  Identical messages close the
--      existence-oracle (Exploit A).
--
--   4. Revoke direct execution from the anon role as defence-in-depth.
--      Authenticated users can still call the function directly, but because
--      auth.uid() is the sole auth source they can only ever retrieve data for
--      their own job sites.

-- ── Step 1: drop the vulnerable overload ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_next_quote_number(UUID, UUID);

-- ── Step 2: create the hardened replacement ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_next_quote_number(
  p_job_site_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_max_num        INTEGER;
  v_client_prefix  TEXT;
  v_actual_user_id UUID;
BEGIN
  -- Resolve the owner of the requested job site.
  SELECT c.user_id
  INTO   v_actual_user_id
  FROM   public.clients   c
  JOIN   public.job_sites js ON js.client_id = c.id
  WHERE  js.id = p_job_site_id;

  -- Single opaque guard: treat "row missing" and "wrong owner" identically.
  -- auth.uid() is populated by PostgREST from the request JWT and cannot be
  -- forged by the caller, so this check is authoritative.
  IF v_actual_user_id IS NULL OR v_actual_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not found';
  END IF;

  -- Two-letter prefix from the owning client's name.
  SELECT UPPER(SUBSTRING(c.name, 1, 2))
  INTO   v_client_prefix
  FROM   public.clients   c
  JOIN   public.job_sites js ON js.client_id = c.id
  WHERE  js.id = p_job_site_id;

  v_client_prefix := COALESCE(v_client_prefix, 'XX');

  -- Highest existing sequence number for this job site.
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(quote_number, POSITION('-' IN quote_number) + 1) AS INTEGER)),
    0
  )
  INTO  v_max_num
  FROM  public.quotes
  WHERE job_site_id = p_job_site_id;

  RETURN v_client_prefix || '-' || LPAD((v_max_num + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Step 3: defence-in-depth privilege reduction ──────────────────────────────
-- Unauthenticated (anon) callers have no business calling this function.
REVOKE EXECUTE ON FUNCTION public.get_next_quote_number(UUID) FROM anon;
