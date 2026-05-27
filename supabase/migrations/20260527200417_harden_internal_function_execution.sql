-- Further function hardening based on Security Advisor findings.
--
-- 1) handle_new_user() is an internal trigger helper and should not be callable
--    through the Data API.
-- 2) get_next_quote_number() no longer needs SECURITY DEFINER; it can run as
--    SECURITY INVOKER because its logic is fully schema-qualified and protected
--    by normal table privileges, RLS, and auth.uid().

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated, service_role;

ALTER FUNCTION public.get_next_quote_number(UUID) SECURITY INVOKER;
