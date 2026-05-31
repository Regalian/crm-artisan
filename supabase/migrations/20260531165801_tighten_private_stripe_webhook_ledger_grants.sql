-- Restrict the internal Stripe webhook ledger to only the privileges used by the
-- runtime path. The webhook handler claims events via INSERT and releases failed
-- claims via DELETE through service_role-only RPCs.

REVOKE ALL ON TABLE private.stripe_webhook_events FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT, DELETE ON TABLE private.stripe_webhook_events TO service_role;
