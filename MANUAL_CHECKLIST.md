# Step 3 Manual Checklist — Stripe Webhook Endpoint

Webhook route file:
- `src/app/api/webhooks/stripe/route.ts`

Public URL path:
- `/api/webhooks/stripe`

## Preconditions

- App running locally
- Stripe CLI logged in
- `.env.local` contains server-only secrets:
  - `STRIPE_WEBHOOK_SECRET`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Stripe CLI forwarding to your local app:

```bash
stripe listen --forward-to http://192.168.0.116:3000/api/webhooks/stripe
```

Keep 3 things open while testing:
- browser with the app
- terminal running `stripe listen`
- Supabase SQL editor

## Handy SQL checks

Replace `artisan@example.com` with the email you used for checkout.

### 1) Find the user + billing row

```sql
select
  u.id as user_id,
  u.email,
  ab.plan_tier,
  ab.access_state,
  ab.stripe_customer_id,
  ab.stripe_subscription_id,
  ab.stripe_price_id,
  ab.stripe_subscription_status,
  ab.cancel_at_period_end,
  ab.current_period_start,
  ab.current_period_end,
  ab.last_invoice_id,
  ab.last_invoice_status,
  ab.last_payment_failed_at,
  ab.updated_at
from auth.users u
left join public.account_billing ab on ab.user_id = u.id
where u.email = 'artisan@example.com';
```

### 2) Inspect recent webhook ledger entries

```sql
select event_id, event_type, livemode, processed_at
from public.stripe_webhook_events
order by processed_at desc
limit 20;
```

---

## Test 1 — Signature verification rejects fake requests

### Action

Run:

```bash
curl -i -X POST http://192.168.0.116:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"id":"evt_fake","type":"invoice.payment_failed"}'
```

### Expected

- HTTP `400`
- no new row in `public.stripe_webhook_events`
- no change to `public.account_billing`

---

## Test 2 — Real successful upgrade

### Action

1. Sign in to the app as a free user.
2. Go to `/dashboard`.
3. Click **Upgrade to Premium**.
4. Complete Checkout with a Stripe success test card.
   - Example: `4242 4242 4242 4242`
5. Let Stripe redirect back to `/dashboard?upgraded=true`.
6. Watch the `stripe listen` terminal.

### Expected in browser

- Stripe-hosted Checkout opens
- after payment, you return to `/dashboard?upgraded=true`
- dashboard shows `Welcome to Premium!`
- after webhook processing + refresh, the **Upgrade to Premium** button disappears

### Expected in Stripe CLI output

You should see at least:
- `checkout.session.completed`
- usually also `invoice.payment_succeeded` or `invoice.paid`

### Expected in Supabase

`public.account_billing` should show:
- `plan_tier = 'premium'`
- `access_state = 'premium_active'`
- `stripe_customer_id` populated
- `stripe_subscription_id` populated
- `stripe_price_id` populated
- `last_payment_failed_at = null`

`public.stripe_webhook_events` should contain rows for the received events.

---

## Test 3 — Cancel the real subscription and watch `customer.subscription.deleted`

First get the subscription ID from the SQL query above.

### Action

```bash
stripe subscriptions cancel sub_XXXXXXXX --confirm
```

### Expected in Stripe CLI output

- `customer.subscription.deleted`

### Expected in Supabase

`public.account_billing` should update to:
- `plan_tier = 'free'`
- `access_state = 'free'`
- `stripe_subscription_status = 'canceled'`

### Expected in browser

- refresh `/dashboard`
- **Upgrade to Premium** button is visible again

---

## Test 4 — Duplicate protection

### Local note

This is awkward to prove with only `stripe listen --forward-to ...` because that forwarder is not the same as a persistent dashboard webhook endpoint you can easily replay to by ID.

### What is already covered automatically

Automated unit tests already verify:
- duplicate event IDs are ignored
- the endpoint returns `200` for duplicates
- billing is not updated twice

### Best manual confirmation later

Do this on a deployed/staging webhook endpoint registered in Stripe Dashboard:
- resend the same `evt_...` event
- confirm only one `event_id` row exists in `public.stripe_webhook_events`
- confirm billing state does not change twice

---

## Test 5 — `invoice.payment_failed` on a real subscription

### Practical note

This is the hardest one to reproduce realistically from the current app flow.
A real positive test needs a failure on the same Stripe customer/subscription your app created.

### Recommended realistic way

Use Stripe Dashboard test mode on the real customer/subscription created in Test 2:
1. open the customer
2. replace the default payment method with a failing test card
   - use `4000 0000 0000 9995` for `insufficient_funds`
3. force a payment attempt on the relevant subscription invoice
4. watch for `invoice.payment_failed`

### Expected in Supabase

`public.account_billing` should show:
- `plan_tier = 'premium'`
- `access_state = 'past_due'`
- `last_invoice_status` updated
- `last_payment_failed_at` populated

### Important implementation note

Current code marks `past_due` on `invoice.payment_failed` immediately.
It does **not** wait for all retry attempts to be exhausted yet.
That policy refinement belongs to a later billing-state improvement.

---

## Pass criteria for Step 3

Minimum local manual sign-off:
- Test 1 passes
- Test 2 passes
- Test 3 passes

Additional confidence:
- review webhook ledger rows in `public.stripe_webhook_events`
- run Test 5 when you are ready to test dunning behavior more deeply
