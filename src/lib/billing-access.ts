export type PlanTier = "free" | "premium";
export type AccessState = "free" | "premium_active" | "premium_canceling" | "payment_retrying" | "past_due";

export type BillingAccessSnapshot = {
  userId: string;
  planTier: PlanTier;
  accessState: AccessState;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  cancelAtPeriodEnd: boolean;
};

export function isFreePlan(billing: Pick<BillingAccessSnapshot, "planTier">) {
  return billing.planTier === "free";
}

export function hasUnlimitedJobSitesAccess(billing: Pick<BillingAccessSnapshot, "accessState">) {
  return billing.accessState === "premium_active" || billing.accessState === "premium_canceling" || billing.accessState === "payment_retrying";
}
