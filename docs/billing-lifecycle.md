# Billing lifecycle

This document explains what happens when you upgrade, renew, cancel, or run into a payment problem in CRM Artisan.

## Plans

### Free
- Up to 5 active job sites
- Active means a job site with status:
  - `Planned`
  - `In Progress`

### Premium
- £19/month
- Unlimited active job sites

If you go back to Free after using Premium, we do **not** delete any job sites. You keep your existing data. You just can’t create more active job sites until you are back under the Free limit.

---

## 1. Upgrading to Premium

When you click **Upgrade to Premium**:

1. CRM Artisan opens a secure Stripe-hosted checkout page.
2. You enter your payment details on Stripe’s page, not inside CRM Artisan.
3. If payment succeeds, Stripe creates your subscription.
4. Stripe notifies CRM Artisan in the background.
5. You return to the app and Premium access is enabled.

### What you’ll see
- A success message when you come back to the app
- Your plan changes to Premium
- The upgrade prompt disappears
- You can create more than 5 active job sites

---

## 2. Monthly renewal

Premium renews automatically every month.

When Stripe successfully charges your card:

1. Stripe renews the subscription
2. Stripe notifies CRM Artisan
3. Your Premium access continues with no action needed

### What you’ll see
Usually nothing changes visibly beyond your billing dates updating.

---

## 3. Managing your subscription

You can manage billing by opening the **Billing** screen from your signed-in email area.

From there you can open the Stripe Customer Portal to:
- cancel your subscription
- resume a cancelled subscription before it ends
- update card details
- manage billing information

Stripe handles these actions securely.

---

## 4. Cancelling your subscription

If you cancel Premium:

1. The cancellation is scheduled in Stripe
2. CRM Artisan updates your billing status
3. You keep Premium until the end of the billing period you already paid for
4. After that date, your account returns to Free

### What you’ll see on the Billing page
- A cancelled / ending status
- The date Premium access expires
- A button to manage or resume the subscription if it is still within the paid period

### Important
Cancelling does **not** delete your data.

If you return to Free while you still have 6 or more active job sites:
- your existing job sites stay exactly as they are
- you won’t be able to create more active job sites
- to create a new active job site on Free, you must get back under 5 active job sites first

---

## 5. Payment failures

If a renewal payment fails:

1. Stripe tells CRM Artisan that the payment needs attention
2. Your account moves into a billing warning state
3. You keep Premium access while Stripe retries the payment
4. You can open the billing portal and update your card

### What you’ll see
On the Billing page, you’ll see a warning that your payment needs attention and a button to manage your subscription.

### If payment is fixed
- Stripe retries or charges successfully
- Premium continues normally

### If payment is not fixed
- your billing status can move into a more serious overdue state
- you’ll continue to see billing warnings until the subscription is recovered or ends

---

## 6. What happens when Premium ends

When Premium fully ends:

- your plan becomes Free
- the Free plan limit applies again
- your existing job sites, clients, and quotes remain in your account

### If you are over the Free limit
You can still view and manage your existing records.

But you may be blocked from:
- creating new active job sites
- reactivating completed job sites into an active status

To create a new active job site on Free, you must first reduce your active total to fewer than 5.

---

## 7. Security and payments

To keep billing safe:

- card details are collected by Stripe, not stored in CRM Artisan
- Stripe sends secure server-to-server updates to confirm payment events
- duplicate billing events are handled safely
- billing secrets never go to the browser

---

## Quick summary

### Upgrade
- Click Upgrade
- Pay on Stripe
- Come back with Premium enabled

### Renew
- Stripe charges monthly
- Premium continues automatically if payment succeeds

### Cancel
- Premium stays active until the paid period ends
- Then the account returns to Free

### Payment problem
- You are warned
- Stripe retries
- You can update your card in the billing portal

### Downgrade while over the limit
- Nothing is deleted
- You keep your data
- You must get back under 5 active job sites before creating another active one on Free
