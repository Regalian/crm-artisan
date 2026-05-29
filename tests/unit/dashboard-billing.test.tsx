import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { getDashboardSummary, getRecentActivity, getCurrentAccountBilling } = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
  getRecentActivity: vi.fn(),
  getCurrentAccountBilling: vi.fn(),
}));

vi.mock("@/lib/server/dashboard", () => ({
  getDashboardSummary,
  getRecentActivity,
}));

vi.mock("@/lib/server/billing", () => ({
  getCurrentAccountBilling,
  isFreePlan: (billing: { planTier: string }) => billing.planTier === "free",
}));

vi.mock("@/app/(app)/dashboard/_components/MetricCard", () => ({
  MetricCard: ({ label, value }: { label: string; value: string }) => <div>{label}: {value}</div>,
}));

vi.mock("@/app/(app)/dashboard/_components/QuoteStatusBreakdown", () => ({
  QuoteStatusBreakdown: () => <div>Quote Status Breakdown</div>,
}));

vi.mock("@/app/(app)/dashboard/_components/RecentActivityList", () => ({
  RecentActivityList: () => <div>Recent Activity</div>,
}));

import DashboardPage from "@/app/(app)/dashboard/page";

function arrangeBilling(planTier: "free" | "premium") {
  getDashboardSummary.mockResolvedValue({
    activeJobSitesCount: 0,
    acceptedValueThisMonth: 0,
    clientsCount: 0,
    quotesDraftCount: 0,
    quotesSentCount: 0,
    quotesAcceptedCount: 0,
    quotesRejectedCount: 0,
  });
  getRecentActivity.mockResolvedValue([]);
  getCurrentAccountBilling.mockResolvedValue({
    userId: "user_123",
    planTier,
    accessState: planTier === "free" ? "free" : "premium_active",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    cancelAtPeriodEnd: false,
  });
}

describe("Dashboard billing", () => {
  it("shows the upgrade button for free users", async () => {
    arrangeBilling("free");

    render(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("button", { name: /upgrade to premium/i })).toBeInTheDocument();
  });

  it("shows the welcome message after a successful checkout redirect", async () => {
    arrangeBilling("free");

    render(await DashboardPage({ searchParams: Promise.resolve({ upgraded: "true" }) }));

    expect(screen.getByText("Welcome to Premium!")).toBeInTheDocument();
  });

  it("hides the upgrade button for premium users", async () => {
    arrangeBilling("premium");

    render(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(screen.queryByRole("button", { name: /upgrade to premium/i })).not.toBeInTheDocument();
  });
});
