-- Harden function search_path settings to satisfy the Supabase security
-- advisor and reduce schema-resolution risk for application functions.
--
-- We use an empty search_path for functions whose bodies already reference
-- relations/functions with explicit schema qualification or only use pg_catalog
-- built-ins.

ALTER FUNCTION public.handle_updated_at() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.get_next_quote_number(UUID) SET search_path = '';
ALTER FUNCTION public.get_dashboard_summary() SET search_path = '';
ALTER FUNCTION public.get_recent_activity(INTEGER) SET search_path = '';
ALTER FUNCTION private.current_quote_total(UUID) SET search_path = '';
ALTER FUNCTION private.handle_quote_status_metadata() SET search_path = '';
