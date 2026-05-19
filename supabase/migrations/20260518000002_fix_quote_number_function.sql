-- Fix get_next_quote_number() to verify user ownership
-- Previously: any caller could pass any job_site_id and see quote numbering
-- for any user's job site (because SECURITY DEFINER bypasses RLS).
-- Now: the function verifies the job site belongs to the caller before
-- returning a quote number.

CREATE OR REPLACE FUNCTION public.get_next_quote_number(
  p_job_site_id UUID,
  p_user_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_max_num INTEGER;
  v_client_prefix TEXT;
  v_actual_user_id UUID;
BEGIN
  -- Verify the job site exists and belongs to the caller
  SELECT c.user_id
  INTO v_actual_user_id
  FROM public.clients c
  JOIN public.job_sites js ON js.client_id = c.id
  WHERE js.id = p_job_site_id;

  -- Job site not found at all
  IF v_actual_user_id IS NULL THEN
    RAISE EXCEPTION 'Job site not found';
  END IF;

  -- Job site exists but belongs to someone else
  IF v_actual_user_id != p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get client name first 2 chars for prefix
  SELECT SUBSTRING(c.name, 1, 2)::TEXT
  INTO v_client_prefix
  FROM public.clients c
  JOIN public.job_sites js ON js.client_id = c.id
  WHERE js.id = p_job_site_id;

  v_client_prefix := UPPER(COALESCE(v_client_prefix, 'XX'));

  -- Find max quote number for this job site
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number, POSITION('-' IN quote_number) + 1) AS INTEGER)
  ), 0)
  INTO v_max_num
  FROM public.quotes
  WHERE job_site_id = p_job_site_id;

  RETURN v_client_prefix || '-' || LPAD((v_max_num + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
