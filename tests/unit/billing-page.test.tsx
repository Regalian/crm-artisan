import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { getCurrentAccountBilling } = vi.hoisted(() => ({
  getCurrentAccountBilling: vi.fn(),
}));

vi.mock("@/lib/server/billing", () => ({
  getCurrentAccountBilling,
  isFreePlan: (billing: { planTier: string }) => billing.planTier === "free",
  canManageBillingPortal: (billing: { stripeCustomerId: string | null; planTier: string }) => Boolean(billing.stripeCustomerId) && billing.planTier === "premium",
}));

import BillingPage from "@/app/(app)/billing/page";

function makeBilling(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user_123",
    planTier: "free",
    accessState: "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeSubscriptionStatus: null,
    cancelAtPeriodEnd: false,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    lastInvoiceId: null,
    lastInvoiceStatus: null,
    lastPaymentFailedAt: null,
    ...overrides,
  };
}

describe("Billing page", () => {
  it("shows upgrade controls for free users", async () => {
    getCurrentAccountBilling.mockResolvedValue(makeBilling());

    render(await BillingPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upgrade to premium/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /manage subscription/i })).not.toBeInTheDocument();
  });

  it("shows portal management controls for premium users", async () => {
    getCurrentAccountBilling.mockResolvedValue(makeBilling({
      planTier: "premium",
      accessState: "premium_active",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      currentPeriodEnd: "2026-07-01T00:00:00.000Z",
    }));

    render(await BillingPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText(/Premium is active/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage subscription/i })).toBeInTheDocument();
  });

  it("shows canceling language and expiry date when cancellation is scheduled", async () => {
    getCurrentAccountBilling.mockResolvedValue(makeBilling({
      planTier: "premium",
      accessState: "premium_canceling",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2026-07-01T00:00:00.000Z",
    }));

    render(await BillingPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText(/Premium will end at period close/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancelled — Premium access ends on 01 Jul 2026/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Premium access ends on 01 Jul 2026/i)).toHaveLength(2);
    expect(screen.getByRole("button", { name: /manage subscription/i })).toBeInTheDocument();
  });

  it("shows a portal error banner when redirected back with portalError=true", async () => {
    getCurrentAccountBilling.mockResolvedValue(makeBilling());

    render(await BillingPage({ searchParams: Promise.resolve({ portalError: "true" }) }));

    expect(screen.getByText(/Could not open billing portal/i)).toBeInTheDocument();
  });
});
