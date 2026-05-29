import { requireAuthenticatedUser } from "@/lib/server/auth";

export type AccountBilling = {
  userId: string;
  planTier: "free" | "premium";
  accessState: "free" | "premium_active" | "premium_canceling" | "payment_retrying" | "past_due";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  cancelAtPeriodEnd: boolean;
};

function toAccountBilling(userId: string, data?: {
  plan_tier?: string | null;
  access_state?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  cancel_at_period_end?: boolean | null;
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
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
  };
}

export async function getCurrentAccountBilling(): Promise<AccountBilling> {
  const { supabase, user } = await requireAuthenticatedUser();

  const { data, error } = await supabase
    .from("account_billing")
    .select("plan_tier, access_state, stripe_customer_id, stripe_subscription_id, stripe_price_id, cancel_at_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return toAccountBilling(user.id, data);
}

export function isFreePlan(billing: AccountBilling) {
  return billing.planTier === "free";
}
