CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

UPDATE public.quotes
SET accepted_at = COALESCE(updated_at, created_at)
WHERE status = 'accepted'
  AND accepted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'job_site', 'quote')),
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'client_created',
      'job_site_created',
      'job_site_updated',
      'quote_created',
      'quote_sent',
      'quote_accepted',
      'quote_rejected',
      'quote_reverted_to_draft'
    )
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own activity" ON public.activity_log;
CREATE POLICY "Users can view their own activity"
ON public.activity_log
FOR SELECT
USING (auth.uid() = user_id);

GRANT SELECT ON public.activity_log TO authenticated;

CREATE OR REPLACE FUNCTION private.current_quote_total(p_quote_id UUID)
RETURNS NUMERIC(12,2)
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    SUM(ROUND((qli.quantity * qli.unit_price)::numeric, 2)),
    0
  )::NUMERIC(12,2)
  FROM public.quote_line_items qli
  WHERE qli.quote_id = p_quote_id;
$$;

CREATE OR REPLACE FUNCTION private.handle_quote_status_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'accepted' THEN
      NEW.accepted_at = COALESCE(NEW.accepted_at, now());
    ELSE
      NEW.accepted_at = NULL;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' THEN
    NEW.accepted_at = COALESCE(NEW.accepted_at, OLD.accepted_at, now());
  ELSE
    NEW.accepted_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_quotes_accepted_at ON public.quotes;
CREATE TRIGGER set_quotes_accepted_at
BEFORE INSERT OR UPDATE OF status ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION private.handle_quote_status_metadata();

CREATE OR REPLACE VIEW public.quote_amounts
WITH (security_invoker = true) AS
SELECT
  q.id,
  c.user_id,
  q.job_site_id,
  q.quote_number,
  q.date,
  q.status,
  q.accepted_at,
  q.created_at,
  q.updated_at,
  COALESCE(SUM(ROUND((qli.quantity * qli.unit_price)::numeric, 2)), 0)::NUMERIC(12,2) AS total_amount
FROM public.quotes q
JOIN public.job_sites js ON js.id = q.job_site_id
JOIN public.clients c ON c.id = js.client_id
LEFT JOIN public.quote_line_items qli ON qli.quote_id = q.id
GROUP BY q.id, c.user_id, q.job_site_id, q.quote_number, q.date, q.status, q.accepted_at, q.created_at, q.updated_at;

GRANT SELECT ON public.quote_amounts TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS TABLE (
  active_job_sites_count BIGINT,
  accepted_value_this_month NUMERIC(12,2),
  clients_count BIGINT,
  quotes_draft_count BIGINT,
  quotes_sent_count BIGINT,
  quotes_accepted_count BIGINT,
  quotes_rejected_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  WITH my_clients AS (
    SELECT id
    FROM public.clients
    WHERE user_id = auth.uid()
  ),
  my_job_sites AS (
    SELECT id, status
    FROM public.job_sites
    WHERE client_id IN (SELECT id FROM my_clients)
  ),
  my_quotes AS (
    SELECT id, status
    FROM public.quotes
    WHERE job_site_id IN (SELECT id FROM my_job_sites)
  )
  SELECT
    (SELECT COUNT(*) FROM my_job_sites WHERE status IN ('planned', 'in_progress')),
    (
      SELECT COALESCE(SUM(qa.total_amount), 0)::NUMERIC(12,2)
      FROM public.quote_amounts qa
      WHERE qa.user_id = auth.uid()
        AND qa.status = 'accepted'
        AND qa.accepted_at >= date_trunc('month', now())
        AND qa.accepted_at < date_trunc('month', now()) + INTERVAL '1 month'
    ),
    (SELECT COUNT(*) FROM my_clients),
    (SELECT COUNT(*) FROM my_quotes WHERE status = 'draft'),
    (SELECT COUNT(*) FROM my_quotes WHERE status = 'sent'),
    (SELECT COUNT(*) FROM my_quotes WHERE status = 'accepted'),
    (SELECT COUNT(*) FROM my_quotes WHERE status = 'rejected');
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  occurred_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    activity.id,
    activity.event_type,
    activity.entity_type,
    activity.entity_id,
    activity.metadata,
    activity.occurred_at
  FROM public.activity_log activity
  WHERE activity.user_id = auth.uid()
  ORDER BY activity.occurred_at DESC
  LIMIT GREATEST(limit_count, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_activity(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION private.log_client_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  INSERT INTO public.activity_log (user_id, entity_type, entity_id, event_type, metadata)
  VALUES (
    NEW.user_id,
    'client',
    NEW.id,
    'client_created',
    jsonb_build_object(
      'client_name', NEW.name
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.log_job_site_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_client_name TEXT;
BEGIN
  SELECT c.user_id, c.name
  INTO v_user_id, v_client_name
  FROM public.clients c
  WHERE c.id = NEW.client_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, entity_type, entity_id, event_type, metadata)
    VALUES (
      v_user_id,
      'job_site',
      NEW.id,
      'job_site_created',
      jsonb_build_object(
        'job_site_title', NEW.title,
        'client_name', v_client_name
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (user_id, entity_type, entity_id, event_type, metadata)
    VALUES (
      v_user_id,
      'job_site',
      NEW.id,
      'job_site_updated',
      jsonb_build_object(
        'job_site_title', NEW.title,
        'client_name', v_client_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.log_quote_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_client_name TEXT;
  v_job_site_title TEXT;
  v_event_type TEXT;
  v_total NUMERIC(12,2);
BEGIN
  SELECT c.user_id, c.name, js.title
  INTO v_user_id, v_client_name, v_job_site_title
  FROM public.job_sites js
  JOIN public.clients c ON c.id = js.client_id
  WHERE js.id = NEW.job_site_id;

  v_total := private.current_quote_total(NEW.id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, entity_type, entity_id, event_type, metadata)
    VALUES (
      v_user_id,
      'quote',
      NEW.id,
      'quote_created',
      jsonb_build_object(
        'quote_number', NEW.quote_number,
        'job_site_title', v_job_site_title,
        'client_name', v_client_name,
        'total_amount', v_total
      )
    );

    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_event_type := CASE NEW.status
      WHEN 'sent' THEN 'quote_sent'
      WHEN 'accepted' THEN 'quote_accepted'
      WHEN 'rejected' THEN 'quote_rejected'
      WHEN 'draft' THEN 'quote_reverted_to_draft'
      ELSE NULL
    END;

    IF v_event_type IS NOT NULL THEN
      INSERT INTO public.activity_log (user_id, entity_type, entity_id, event_type, metadata)
      VALUES (
        v_user_id,
        'quote',
        NEW.id,
        v_event_type,
        jsonb_build_object(
          'quote_number', NEW.quote_number,
          'job_site_title', v_job_site_title,
          'client_name', v_client_name,
          'total_amount', v_total
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_client_activity ON public.clients;
CREATE TRIGGER log_client_activity
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION private.log_client_activity();

DROP TRIGGER IF EXISTS log_job_site_activity ON public.job_sites;
CREATE TRIGGER log_job_site_activity
AFTER INSERT OR UPDATE ON public.job_sites
FOR EACH ROW
EXECUTE FUNCTION private.log_job_site_activity();

DROP TRIGGER IF EXISTS log_quote_activity ON public.quotes;
CREATE TRIGGER log_quote_activity
AFTER INSERT OR UPDATE OF status ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION private.log_quote_activity();
