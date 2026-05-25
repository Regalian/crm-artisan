import type { Metadata } from "next";
import Link from "next/link";
import {
  CircleDollarSign,
  FileText,
  MapPin,
  Users,
} from "lucide-react";

import { formatCurrency } from "@/lib/quotes";
import { getDashboardSummary, getRecentActivity } from "@/lib/server/dashboard";
import { MetricCard } from "./_components/MetricCard";
import { QuoteStatusBreakdown } from "./_components/QuoteStatusBreakdown";
import { RecentActivityList } from "./_components/RecentActivityList";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const [summary, recentActivity] = await Promise.all([
    getDashboardSummary(),
    getRecentActivity(5),
  ]);

  const hasAnyData =
    summary.clientsCount > 0 ||
    summary.activeJobSitesCount > 0 ||
    summary.quotesDraftCount > 0 ||
    summary.quotesSentCount > 0 ||
    summary.quotesAcceptedCount > 0 ||
    summary.quotesRejectedCount > 0;

  return (
    <div className="space-y-6 p-4 md:p-8">
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
