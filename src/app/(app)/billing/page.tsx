import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CircleDollarSign, CreditCard, Crown } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { canManageBillingPortal, getCurrentAccountBilling, isFreePlan } from "@/lib/server/billing";

export const metadata: Metadata = {
  title: "Billing",
};

function formatDate(date: string | null) {
  if (!date) {
    return null;
  }

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getBillingStatusSummary(
  billing: Awaited<ReturnType<typeof getCurrentAccountBilling>>,
  currentPeriodEnd: string | null,
) {
  if (billing.accessState === "premium_canceling") {
    return currentPeriodEnd
      ? `Cancelled — Premium access ends on ${currentPeriodEnd}`
      : "Cancelled — Premium access remains available until the end of the current billing period";
  }

  if (billing.accessState === "payment_retrying") {
    return "Payment retry in progress — update card details in the billing portal";
  }

  if (billing.accessState === "past_due") {
    return "Past due — update card details to recover Premium cleanly";
  }

  if (billing.accessState === "premium_active") {
    return "Premium active";
  }

  return "No paid subscription active.";
}

function getBillingPeriodSummary(
  billing: Awaited<ReturnType<typeof getCurrentAccountBilling>>,
  currentPeriodStart: string | null,
  currentPeriodEnd: string | null,
) {
  if (billing.accessState === "premium_canceling" && currentPeriodEnd) {
    return `Premium access ends on ${currentPeriodEnd}`;
  }

  if (currentPeriodStart || currentPeriodEnd) {
    return [
      currentPeriodStart ? `Period start: ${currentPeriodStart}` : null,
      currentPeriodEnd ? `Period end: ${currentPeriodEnd}` : null,
    ].filter(Boolean).join(" • ");
  }

  return null;
}

function StatusNotice({
  title,
  body,
  tone = "info",
}: {
  title: string;
  body: string;
  tone?: "success" | "warning" | "info";
}) {
  const styles = {
    success: {
      wrapper: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300",
      icon: <CheckCircle2 size={18} />,
    },
    warning: {
      wrapper: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
      icon: <AlertCircle size={18} />,
    },
    info: {
      wrapper: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
      icon: <CircleDollarSign size={18} />,
    },
  } as const;

  const style = styles[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 ${style.wrapper}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{style.icon}</div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm">{body}</p>
        </div>
      </div>
    </div>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ portalError?: string }>;
}) {
  const [billing, resolvedSearchParams] = await Promise.all([
    getCurrentAccountBilling(),
    searchParams ?? Promise.resolve<{ portalError?: string }>({}),
  ]);

  const currentPeriodEnd = formatDate(billing.currentPeriodEnd);
  const currentPeriodStart = formatDate(billing.currentPeriodStart);
  const showPortalButton = canManageBillingPortal(billing);
  const showUpgradeButton = isFreePlan(billing);
  const billingStatusSummary = getBillingStatusSummary(billing, currentPeriodEnd);
  const billingPeriodSummary = getBillingPeriodSummary(billing, currentPeriodStart, currentPeriodEnd);

  let statusNotice: ReactNode = null;

  if (billing.accessState === "premium_canceling" && currentPeriodEnd) {
    statusNotice = (
      <StatusNotice
        tone="warning"
        title="Premium will end at period close"
        body={`Your cancellation is scheduled. You keep Premium access until ${currentPeriodEnd}. You can still resume from the billing portal before then.`}
      />
    );
  } else if (billing.accessState === "payment_retrying") {
    statusNotice = (
      <StatusNotice
        tone="warning"
        title="We’re retrying your latest payment"
        body="Your card needs attention, but Premium access is still on while Stripe retries. Open the billing portal to update your card details."
      />
    );
  } else if (billing.accessState === "past_due") {
    statusNotice = (
      <StatusNotice
        tone="warning"
        title="Your subscription needs attention"
        body="Stripe could not collect payment for your subscription. Open the billing portal to update your card and recover access cleanly."
      />
    );
  } else if (!isFreePlan(billing)) {
    statusNotice = (
      <StatusNotice
        tone="success"
        title="Premium is active"
        body={currentPeriodEnd ? `Your current billing period runs until ${currentPeriodEnd}.` : "Your Premium subscription is active."}
      />
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Billing</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Manage your subscription, payment details, and renewal status.
        </p>
      </div>

      {resolvedSearchParams.portalError === "true" ? (
        <StatusNotice
          tone="warning"
          title="Could not open billing portal"
          body="Please try again. If the problem continues, check that this account has a Stripe customer record and an active billing portal configuration."
        />
      ) : null}

      {statusNotice}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {isFreePlan(billing) ? <CreditCard size={22} /> : <Crown size={22} />}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Current plan</p>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                  {isFreePlan(billing) ? "Free" : "Premium"}
                </h2>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Plan details</p>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {isFreePlan(billing)
                    ? "Up to 5 active job sites included. Upgrade to Premium for unlimited active job sites."
                    : "Premium includes unlimited active job sites for £19/month."}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Subscription status</p>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {billingStatusSummary}
                </p>
                {billingPeriodSummary ? (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {billingPeriodSummary}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:max-w-xs">
            {showUpgradeButton ? (
              <form action="/api/stripe/checkout" method="POST">
                <Button type="submit" fullWidth leadingIcon={<Crown size={16} />}>
                  Upgrade to Premium
                </Button>
              </form>
            ) : null}

            {showPortalButton ? (
              <form action="/api/stripe/portal" method="POST">
                <Button type="submit" fullWidth variant={showUpgradeButton ? "secondary" : "primary"} leadingIcon={<CreditCard size={16} />}>
                  Manage subscription
                </Button>
              </form>
            ) : null}

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
