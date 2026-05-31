import type { Metadata } from "next";
import Link from "next/link";
import {
  CircleDollarSign,
  Crown,
  FileText,
  MapPin,
  Users,
} from "lucide-react";

import { formatCurrency } from "@/lib/quotes";
import { getCurrentAccountBilling, isFreePlan } from "@/lib/server/billing";
import { getDashboardSummary, getRecentActivity } from "@/lib/server/dashboard";
import { MetricCard } from "./_components/MetricCard";
import { QuoteStatusBreakdown } from "./_components/QuoteStatusBreakdown";
import { RecentActivityList } from "./_components/RecentActivityList";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ upgraded?: string; billingError?: string }>;
}) {
  const [summary, recentActivity, billing, resolvedSearchParams] = await Promise.all([
    getDashboardSummary(),
    getRecentActivity(5),
    getCurrentAccountBilling(),
    searchParams ?? Promise.resolve<{ upgraded?: string; billingError?: string }>({}),
  ]);

  const showUpgradeButton = isFreePlan(billing);
  const showUpgradeSuccess = resolvedSearchParams.upgraded === "true" && !showUpgradeButton;
  const showBillingError = resolvedSearchParams.billingError === "true";

  const hasAnyData =
    summary.clientsCount > 0 ||
    summary.activeJobSitesCount > 0 ||
    summary.quotesDraftCount > 0 ||
    summary.quotesSentCount > 0 ||
    summary.quotesAcceptedCount > 0 ||
    summary.quotesRejectedCount > 0;

  return (
    <div className="space-y-6 p-4 md:p-8">
      {showUpgradeSuccess ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
          Welcome to Premium!
        </div>
      ) : null}

      {showBillingError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          Could not start checkout. Please try again.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Everything important at a glance before the next job.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/clients"
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              summary.clientsCount === 0
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            Add Client
          </Link>
          {summary.clientsCount > 0 ? (
            <Link
              href="/job-sites"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Add Job Site
            </Link>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600"
              aria-disabled="true"
              title="Add a client first"
            >
              Add Job Site
            </span>
          )}
          {showUpgradeButton ? (
            <form action="/api/stripe/checkout" method="POST">
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                <Crown size={16} />
                <span>Upgrade to Premium</span>
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Active Job Sites"
          value={String(summary.activeJobSitesCount)}
          icon={<MapPin size={20} />}
          hint="Planned + in progress"
        />
        <MetricCard
          label="Accepted This Month"
          value={formatCurrency(summary.acceptedValueThisMonth)}
          icon={<CircleDollarSign size={20} />}
          hint="Accepted quote value"
        />
        <MetricCard
          label="Clients"
          value={String(summary.clientsCount)}
          icon={<Users size={20} />}
          hint="Total client records"
        />
        <MetricCard
          label="Quotes"
          value={String(
            summary.quotesDraftCount +
              summary.quotesSentCount +
              summary.quotesAcceptedCount +
              summary.quotesRejectedCount,
          )}
          icon={<FileText size={20} />}
          hint="Across all statuses"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <QuoteStatusBreakdown
          counts={{
            draft: summary.quotesDraftCount,
            sent: summary.quotesSentCount,
            accepted: summary.quotesAcceptedCount,
            rejected: summary.quotesRejectedCount,
          }}
        />
        <RecentActivityList activities={recentActivity} />
      </div>

      {!hasAnyData ? (
        <div className="mb-24 rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-black md:mb-0">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Your CRM is ready to go</h2>
          <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
            Start by adding a client, then a job site, then your first quote. Once you do, this dashboard will show live numbers and recent activity automatically.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/clients"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
            >
              Add Your First Client
            </Link>
            <Link
              href="/job-sites"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Add Your First Job Site
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
