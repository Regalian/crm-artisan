-- Explicit Data API grants for public-schema objects used by the app.
--
-- Why:
-- Supabase is changing Data API defaults so new public-schema tables are no
-- longer exposed automatically. This migration makes access explicit for the
-- current CRM objects and tightens accidental anonymous/function exposure.
--
-- Model:
-- - anon: no CRM table/view/RPC access
-- - authenticated: least-privilege access needed by the app
-- - service_role: server-side/admin access if needed

-- Core CRM tables used via supabase-js / PostgREST.
-- Revoke first so existing projects stop depending on legacy default grants and
-- land on a predictable least-privilege baseline.
REVOKE ALL ON TABLE public.clients FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.job_sites FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.quotes FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.quote_line_items FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.activity_log FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.quote_amounts FROM anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clients TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_sites TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quotes TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quote_line_items TO authenticated, service_role;

-- Profiles are read/update oriented for app users. The signup trigger creates
-- rows automatically; INSERT is allowed for authenticated users as a recovery
-- path and matches the existing insert policy.
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

-- Read-only application analytics surfaces for app users.
GRANT SELECT ON TABLE public.activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activity_log TO service_role;
GRANT SELECT ON TABLE public.quote_amounts TO authenticated, service_role;

-- App RPCs should not be callable anonymously.
REVOKE ALL ON FUNCTION public.get_next_quote_number(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_next_quote_number(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_dashboard_summary() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_recent_activity(INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_recent_activity(INTEGER) TO authenticated, service_role;
