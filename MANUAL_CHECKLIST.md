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

---

# Step 4 Manual Checklist — 5 Job-Site Wall

Relevant files:
- `src/app/(app)/job-sites/JobSitesPageClient.tsx`
- `src/app/api/job-sites/route.ts`
- `src/app/api/job-sites/[id]/route.ts`
- `supabase/migrations/20260530100110_enforce_free_job_site_limit.sql`

## Preconditions

- Step 3 is working
- you have one free account and one premium account available for testing
- app running locally
- Supabase local/linked DB migrated with the job-site limit trigger

## Handy SQL checks

Replace `artisan@example.com` with the test user email.

### 1) Count active job sites

```sql
select
  u.email,
  count(*) filter (where js.status in ('planned', 'in_progress')) as active_job_sites,
  count(*) filter (where js.status = 'completed') as completed_job_sites,
  count(*) as total_job_sites
from auth.users u
join public.clients c on c.user_id = u.id
join public.job_sites js on js.client_id = c.id
where u.email = 'artisan@example.com'
group by u.email;
```

### 2) Show billing + job-site summary together

```sql
select
  u.email,
  ab.plan_tier,
  ab.access_state,
  count(*) filter (where js.status in ('planned', 'in_progress')) as active_job_sites,
  count(*) filter (where js.status = 'completed') as completed_job_sites,
  count(js.id) as total_job_sites
from auth.users u
left join public.account_billing ab on ab.user_id = u.id
left join public.clients c on c.user_id = u.id
left join public.job_sites js on js.client_id = c.id
where u.email = 'artisan@example.com'
group by u.email, ab.plan_tier, ab.access_state;
```

### 3) List job sites and statuses

```sql
select
  js.id,
  js.title,
  js.status,
  js.created_at
from auth.users u
join public.clients c on c.user_id = u.id
join public.job_sites js on js.client_id = c.id
where u.email = 'artisan@example.com'
order by js.created_at asc;
```

---

## Test 1 — Free user can create up to 5 active job sites

### Action

1. Sign in as a free user.
2. Make sure the account has a client available.
3. Create job sites with status `planned` or `in_progress` until there are 5 active job sites.

### Expected

- job sites 1 through 5 are created successfully
- no upgrade modal appears before the 6th attempt
- SQL shows:
  - `active_job_sites = 5`
  - `plan_tier = 'free'`

---

## Test 2 — Free user hits the wall on the 6th active job site

### Action

1. While still on the free account with 5 active job sites, click **Add Job Site**.

### Expected in browser

- creation form does **not** open
- modal appears with:
  - `You've hit the free tier limit`
  - `Upgrade to Premium for unlimited job sites.`
- modal has an **Upgrade** button
- clicking **Upgrade** goes straight to Stripe Checkout

### Expected in database

- no 6th active job site is created
- SQL still shows:
  - `active_job_sites = 5`

---

## Test 3 — Premium user has no limit

### Action

1. Sign in as a premium user.
2. Create 6 or more active job sites.

### Expected

- no upgrade modal appears
- job sites keep being created normally
- SQL shows:
  - `plan_tier = 'premium'`
  - `access_state` is one of the premium-access states
  - `active_job_sites >= 6`

---

## Test 4 — Downgrade does not delete existing job sites

### Action

1. Start from a premium user with at least 6 active job sites.
2. Cancel/downgrade back to free.
3. Refresh `/job-sites`.

### Expected

- all existing job sites are still present
- nothing is deleted automatically
- the **Upgrade to Premium** path is back for the user when they try to add more
- SQL shows:
  - `plan_tier = 'free'`
  - `active_job_sites >= 6`
  - existing rows remain intact

---

## Test 5 — Downgraded free user is blocked from creating more active job sites

### Action

1. Using that downgraded free user with 6+ active job sites, click **Add Job Site**.

### Expected

- upgrade modal appears immediately
- no new job site is created
- SQL active count does not change

---

## Test 6 — User must get back under 5 active, not merely down to 5

### Action

1. Start from free with 6 active job sites.
2. Mark **one** active job site as `completed`.
3. Try to create a new active job site.

### Expected

- still blocked
- because the user is at exactly 5 active job sites
- upgrade modal appears
- no new row is created

### Continue

4. Mark a **second** active job site as `completed`.
5. Try again to create a new active job site.

### Expected

- now allowed
- because the user is back under 5 before creating the new one
- after creation, active count returns to 5

---

## Test 7 — Free user cannot reactivate a completed job site if already at the cap

### Action

1. Use a free account with 5 active job sites and 1 completed job site.
2. Edit the completed job site.
3. Change its status from `completed` to `planned`.
4. Save.

### Expected

- save is blocked
- user sees the free-tier limit message
- completed site stays completed
- SQL active count remains 5

---

## Test 8 — Existing active job sites remain editable

### Action

1. Use a free account already at the cap.
2. Edit an existing active job site.
3. Change title, address, notes, or dates without increasing active count.
4. Save.

### Expected

- edit succeeds
- this confirms the wall blocks only capacity increases, not normal edits

---

## Optional hardening check — DB-level protection, not just UI

This verifies the server/database rule is real.

### Pre-check SQL

```sql
select
  u.email,
  ab.plan_tier,
  ab.access_state,
  count(*) filter (where js.status in ('planned', 'in_progress')) as active_job_sites
from auth.users u
left join public.account_billing ab on ab.user_id = u.id
left join public.clients c on c.user_id = u.id
left join public.job_sites js on js.client_id = c.id
where u.email = 'artisan@example.com'
group by u.email, ab.plan_tier, ab.access_state;
```

### Action

Run this in the Supabase SQL editor, replacing the email first:

```sql
begin;

with target_user as (
  select
    u.id as user_id,
    c.id as client_id
  from auth.users u
  join public.clients c on c.user_id = u.id
  where u.email = 'artisan@example.com'
  order by c.created_at asc
  limit 1
)
insert into public.job_sites (
  client_id,
  title,
  address,
  status
)
select
  client_id,
  'DB Hardening Check',
  '123 Test Lane',
  'planned'
from target_user;

rollback;
```

### Expected

- insert is rejected
- error message includes:
  - `You've hit the free tier limit. Upgrade to Premium for unlimited job sites.`

This confirms the wall is enforced below the UI layer.

---

## Pass criteria for Step 4

Minimum acceptance:
- Test 1 passes
- Test 2 passes
- Test 3 passes
- Test 4 passes
- Test 5 passes
- Test 6 passes
- Test 7 passes

High-confidence sign-off:
- Test 8 passes
- optional DB-level protection check passes
