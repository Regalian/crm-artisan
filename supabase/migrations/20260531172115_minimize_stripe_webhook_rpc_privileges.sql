-- Remove direct service_role access to the internal Stripe webhook ledger.
-- The application only needs to claim and release webhook IDs through two
-- tightly scoped RPCs, so the table itself should not be directly accessible.

REVOKE USAGE ON SCHEMA private FROM service_role;
REVOKE ALL ON TABLE private.stripe_webhook_events FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_livemode BOOLEAN,
  p_payload JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_id TEXT;
BEGIN
  INSERT INTO private.stripe_webhook_events (event_id, event_type, livemode, payload)
  VALUES (p_event_id, p_event_type, COALESCE(p_livemode, FALSE), p_payload)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING event_id INTO v_event_id;

  RETURN v_event_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(TEXT, TEXT, BOOLEAN, JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(TEXT, TEXT, BOOLEAN, JSONB)
  TO service_role;

CREATE OR REPLACE FUNCTION public.release_stripe_webhook_event_claim(p_event_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH deleted AS (
    DELETE FROM private.stripe_webhook_events
    WHERE event_id = p_event_id
    RETURNING 1
  )
  SELECT EXISTS(SELECT 1 FROM deleted);
$$;

REVOKE ALL ON FUNCTION public.release_stripe_webhook_event_claim(TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_stripe_webhook_event_claim(TEXT)
  TO service_role;
