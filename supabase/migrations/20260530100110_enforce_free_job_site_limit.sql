CREATE OR REPLACE FUNCTION private.user_has_unlimited_job_sites_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT ab.access_state IN ('premium_active', 'premium_canceling', 'payment_retrying')
      FROM public.account_billing ab
      WHERE ab.user_id = p_user_id
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION private.user_has_unlimited_job_sites_access(UUID) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.enforce_free_job_site_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_user_id UUID;
  v_new_user_id UUID;
  v_active_count BIGINT;
BEGIN
  IF NEW.status NOT IN ('planned', 'in_progress') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT c.user_id
    INTO v_old_user_id
    FROM public.clients c
    WHERE c.id = OLD.client_id;
  END IF;

  SELECT c.user_id
  INTO v_new_user_id
  FROM public.clients c
  WHERE c.id = NEW.client_id;

  IF v_new_user_id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('planned', 'in_progress')
     AND v_old_user_id = v_new_user_id THEN
    RETURN NEW;
  END IF;

  IF private.user_has_unlimited_job_sites_access(v_new_user_id) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_new_user_id::TEXT, 0));

  SELECT COUNT(*)
  INTO v_active_count
  FROM public.job_sites js
  JOIN public.clients c ON c.id = js.client_id
  WHERE c.user_id = v_new_user_id
    AND js.status IN ('planned', 'in_progress');

  IF v_active_count >= 5 THEN
    RAISE EXCEPTION 'You''ve hit the free tier limit. Upgrade to Premium for unlimited job sites.'
      USING ERRCODE = 'P0001',
            DETAIL = 'Free tier users can only have 5 active job sites.',
            HINT = 'Upgrade to Premium or complete one of your existing active job sites.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_free_job_site_limit() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_free_job_site_limit ON public.job_sites;
CREATE TRIGGER enforce_free_job_site_limit
BEFORE INSERT OR UPDATE OF status, client_id ON public.job_sites
FOR EACH ROW
EXECUTE FUNCTION private.enforce_free_job_site_limit();
