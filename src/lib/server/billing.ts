import "server-only";

import {
  canManageBillingPortal,
  type BillingAccessSnapshot,
  hasUnlimitedJobSitesAccess,
  isFreePlan,
} from "@/lib/billing-access";
import { requireAuthenticatedUser } from "@/lib/server/auth";

export type AccountBilling = BillingAccessSnapshot;

function toAccountBilling(userId: string, data?: {
  plan_tier?: string | null;
  access_state?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  stripe_subscription_status?: string | null;
  cancel_at_period_end?: boolean | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  last_invoice_id?: string | null;
  last_invoice_status?: string | null;
  last_payment_failed_at?: string | null;
} | null): AccountBilling {
  return {
    userId,
    planTier: data?.plan_tier === "premium" ? "premium" : "free",
    accessState:
      data?.access_state === "premium_active" ||
      data?.access_state === "premium_canceling" ||
      data?.access_state === "payment_retrying" ||
      data?.access_state === "past_due"
        ? data.access_state
        : "free",
    stripeCustomerId: data?.stripe_customer_id ?? null,
    stripeSubscriptionId: data?.stripe_subscription_id ?? null,
    stripePriceId: data?.stripe_price_id ?? null,
    stripeSubscriptionStatus: data?.stripe_subscription_status ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
    currentPeriodStart: data?.current_period_start ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    lastInvoiceId: data?.last_invoice_id ?? null,
    lastInvoiceStatus: data?.last_invoice_status ?? null,
    lastPaymentFailedAt: data?.last_payment_failed_at ?? null,
  };
}

export async function getCurrentAccountBilling(): Promise<AccountBilling> {
  const { supabase, user } = await requireAuthenticatedUser();

  const { data, error } = await supabase
    .from("account_billing")
    .select("plan_tier, access_state, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_subscription_status, cancel_at_period_end, current_period_start, current_period_end, last_invoice_id, last_invoice_status, last_payment_failed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return toAccountBilling(user.id, data);
}

export { canManageBillingPortal, hasUnlimitedJobSitesAccess, isFreePlan };
