-- Add indexes that support common RLS predicates and high-frequency filtered
-- queries. Leading columns match tenant-ownership checks, and trailing columns
-- support the app's common sort order where applicable.

CREATE INDEX IF NOT EXISTS idx_clients_user_id_name
ON public.clients (user_id, name);

CREATE INDEX IF NOT EXISTS idx_job_sites_client_id_created_at
ON public.job_sites (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_job_site_id_created_at
ON public.quotes (job_site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id_sort_order
ON public.quote_line_items (quote_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id_occurred_at
ON public.activity_log (user_id, occurred_at DESC);
