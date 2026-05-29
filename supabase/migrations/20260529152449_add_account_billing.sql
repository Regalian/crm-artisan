-- Billing state for each account. This is the authoritative application-side
-- record of subscription access and must not be user-editable.

CREATE TABLE public.account_billing (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'premium')),
  access_state TEXT NOT NULL DEFAULT 'free' CHECK (
    access_state IN ('free', 'premium_active', 'premium_canceling', 'payment_retrying', 'past_due')
  ),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  stripe_subscription_status TEXT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  last_invoice_id TEXT,
  last_invoice_status TEXT,
  last_payment_failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_billing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own billing" ON public.account_billing;
CREATE POLICY "Users can view their own billing"
ON public.account_billing
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Supabase Data API explicit grants for newly-created public tables.
REVOKE ALL ON TABLE public.account_billing FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.account_billing TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.account_billing TO service_role;

DROP TRIGGER IF EXISTS set_account_billing_updated_at ON public.account_billing;
CREATE TRIGGER set_account_billing_updated_at
BEFORE UPDATE ON public.account_billing
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Backfill billing rows for existing users.
INSERT INTO public.account_billing (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.account_billing ab ON ab.user_id = u.id
WHERE ab.user_id IS NULL;

-- Create free billing rows for future users.
CREATE OR REPLACE FUNCTION private.handle_new_user_account_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.account_billing (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user_account_billing() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created_account_billing ON auth.users;
CREATE TRIGGER on_auth_user_created_account_billing
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.handle_new_user_account_billing();
