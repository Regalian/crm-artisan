# Payment integration bugs to check

This checklist covers the most common and costly subscription billing bugs to verify before shipping changes to Stripe integration code.

## Highest-risk checks

### 1. Success redirect grants access before webhook
- Start a successful upgrade
- Delay or observe webhook timing
- Confirm Premium access comes from database billing state, not just the `?upgraded=true` URL
- Confirm the UI can show a success message without granting access early

### 2. Webhook signature verification is enforced
- Send a fake `curl` POST to `/api/webhooks/stripe`
- Expect HTTP `400`
- Confirm no Supabase billing data changes
- Confirm webhook code verifies the raw request body with Stripe’s signature

### 3. Duplicate webhooks do not double-process
- Resend the same Stripe event ID
- Confirm the event is ignored safely
- Confirm billing state is not applied twice
- Confirm the idempotency ledger row remains unique

### 4. Out-of-order webhooks do not leave the wrong final state
- Cancel, resume, then cancel again from the portal
- Confirm the final app state matches Stripe’s final state
- Check Stripe Dashboard / CLI, Supabase, and UI all agree

### 5. Scheduled cancellation is recognized correctly
- Cancel from Stripe Customer Portal
- Confirm the app handles both cancellation styles:
  - `cancel_at_period_end = true`
  - future `cancel_at`
- Confirm the app shows the Premium expiry date correctly

### 6. Billing dates are stored correctly
- After successful checkout, verify billing dates are populated
- After cancellation scheduling, verify the effective end date is stored
- After renewal, verify dates are refreshed

---

## Subscription lifecycle checks

### 7. Monthly renewal keeps Premium active
- Trigger or observe a successful renewal
- Confirm:
  - `plan_tier = premium`
  - `access_state = premium_active`
  - invoice info updates

### 8. Renewal payment failure does not kick the user out immediately
- Trigger a recurring payment failure on an existing premium subscription
- Confirm the app moves to:
  - `payment_retrying`
- Confirm the user still has Premium access while Stripe retries
- Confirm the billing page points them to update card details

### 9. Terminal failure does not stay in retrying forever
- Move the subscription into a terminal bad state in Stripe if possible
- Confirm the app transitions from retrying to the appropriate terminal state
- Confirm access rules match product expectations

### 10. Customer Portal cancellation and resume sync correctly
- Cancel in the portal
- Confirm app moves to `premium_canceling`
- Resume in the portal
- Confirm app returns to `premium_active`
- Let subscription end fully and confirm app becomes `free`

### 11. Free ex-subscribers still have a sensible billing path
- Decide intentionally whether free ex-customers should still access Stripe portal
- Confirm `/billing` behaves consistently with that product decision
- Avoid trapping users in a state where they can’t fix billing or view next steps

---

## App business-rule checks

### 12. Free-tier job-site limit is enforced below the UI
- Attempt to insert a 6th active job site directly via SQL or API
- Confirm database rejects it
- Confirm the rule is not only in React/UI code

### 13. Concurrent creates cannot bypass the free-tier limit
- Attempt simultaneous job-site creation requests near the cap
- Confirm locking / transaction rules prevent limit bypass

### 14. Downgrading does not delete or silently archive data
- Downgrade a Premium user with 6+ active job sites
- Confirm all job sites remain intact
- Confirm only new capacity is blocked

### 15. Active-to-active status changes still work over the cap
- Use a downgraded free user over the cap
- Change `planned -> in_progress`
- Confirm it succeeds because it does not increase active capacity

### 16. Valid status transitions are not blocked by validation bugs
- Verify these expected transitions work:
  - `planned -> in_progress`
  - `in_progress -> completed`
- Confirm invalid transitions are still rejected

---

## Environment and configuration checks

### 17. Checkout and Portal return URLs use the correct host
- Open the app on a LAN IP or alternate local host
- Start Checkout and Customer Portal flows
- Confirm the return URL comes back to the same host you used, not always `localhost`

### 18. Test and live Stripe settings are not mixed
- Review these values together:
  - `STRIPE_API_KEY`
  - `STRIPE_PREMIUM_PRICE_ID`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_BILLING_PORTAL_CONFIGURATION_ID`
- Confirm they are all from the same Stripe mode

### 19. Customer Portal configuration actually enables needed actions
- In Stripe test mode, confirm portal config allows:
  - payment method updates
  - subscription cancellation
  - the intended cancellation timing
  - resume/reactivation if your app expects it

### 20. Secret keys never reach the browser
- Confirm only the publishable Stripe key is public
- Verify no secret or service-role key is exposed through `NEXT_PUBLIC_*`
- Check code, env usage, and client-bound config carefully

---

## UI consistency checks

### 21. Billing page always matches the real billing state
For each state, verify the UI is correct:
- `free`
- `premium_active`
- `premium_canceling`
- `payment_retrying`
- `past_due`

Check all of these against the same source of truth:
- top notice/banner
- subscription status panel
- CTA buttons
- dashboard upgrade visibility

### 22. Banners and notices do not linger after state changes
- Upgrade, then cancel, then return to the app
- Confirm old success banners do not remain after the state changes
- Confirm temporary error banners only show when they should

### 23. Users who need Customer Portal can actually reach it
- Confirm `premium_canceling` users still see **Manage subscription**
- Confirm `payment_retrying` users still see **Manage subscription**
- Confirm users with billing issues can still recover without support intervention

---

## Recommended minimum regression matrix

If time is limited, always run these checks:

1. Fresh upgrade success
2. Webhook delayed vs redirect
3. Monthly renewal success
4. Portal cancel at period end
5. Portal resume before expiry
6. Recurring payment failure → retrying state
7. Final end / deletion → free
8. Free-tier DB hardening for the 6th active job site

---

## Final cross-check before shipping

For at least one real test user, compare these three sources side by side:

1. Stripe Dashboard / Stripe CLI subscription object
2. Supabase `account_billing` row
3. What the app UI says

If those three do not agree, you still have a billing bug.
