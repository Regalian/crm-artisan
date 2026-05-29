import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

type AccessState = "free" | "premium_active" | "premium_canceling" | "payment_retrying" | "past_due";
type PlanTier = "free" | "premium";

type BillingUpsert = {
  userId: string;
  planTier: PlanTier;
  accessState: AccessState;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeSubscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  lastInvoiceId: string | null;
  lastInvoiceStatus: string | null;
  lastPaymentFailedAt: string | null;
};

function toIsoFromUnixTimestamp(value: number | null | undefined) {
  if (typeof value !== "number") {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function getStripeId(value: string | Stripe.Response<object> | Stripe.DeletedCustomer | Stripe.Invoice | Stripe.Subscription | null | undefined) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if ("id" in value && typeof value.id === "string") {
    return value.id;
  }

  return null;
}

function isDuplicateInsertError(error: { code?: string | null; message?: string | null } | null) {
  if (!error) {
    return false;
  }

  return error.code === "23505" || error.message?.toLowerCase().includes("duplicate key") === true;
}

async function rememberEvent(event: Stripe.Event) {
  const admin = createAdminClient();
  const { error } = await admin.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    payload: event,
  });

  if (isDuplicateInsertError(error)) {
    return false;
  }

  if (error) {
    throw error;
  }

  return true;
}

async function forgetEvent(eventId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("stripe_webhook_events").delete().eq("event_id", eventId);

  if (error) {
    console.error("Failed to release Stripe webhook event claim:", eventId, error);
  }
}

async function resolveUserIdFromBilling(options: {
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
}) {
  const admin = createAdminClient();

  if (options.stripeSubscriptionId) {
    const { data, error } = await admin
      .from("account_billing")
      .select("user_id")
      .eq("stripe_subscription_id", options.stripeSubscriptionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.user_id) {
      return data.user_id as string;
    }
  }

  if (options.stripeCustomerId) {
    const { data, error } = await admin
      .from("account_billing")
      .select("user_id")
      .eq("stripe_customer_id", options.stripeCustomerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.user_id) {
      return data.user_id as string;
    }
  }

  return null;
}

async function upsertBilling(update: BillingUpsert) {
  const admin = createAdminClient();
  const { error } = await admin.from("account_billing").upsert({
    user_id: update.userId,
    plan_tier: update.planTier,
    access_state: update.accessState,
    stripe_customer_id: update.stripeCustomerId,
    stripe_subscription_id: update.stripeSubscriptionId,
    stripe_price_id: update.stripePriceId,
    stripe_subscription_status: update.stripeSubscriptionStatus,
    cancel_at_period_end: update.cancelAtPeriodEnd,
    current_period_start: update.currentPeriodStart,
    current_period_end: update.currentPeriodEnd,
    last_invoice_id: update.lastInvoiceId,
    last_invoice_status: update.lastInvoiceStatus,
    last_payment_failed_at: update.lastPaymentFailedAt,
  }, {
    onConflict: "user_id",
  });

  if (error) {
    throw error;
  }
}

function buildSubscriptionBillingUpdate(
  userId: string,
  subscription: Stripe.Subscription,
  overrides?: Partial<Omit<BillingUpsert, "userId">>,
): BillingUpsert {
  return {
    userId,
    planTier: overrides?.planTier ?? "premium",
    accessState: overrides?.accessState ?? "premium_active",
    stripeCustomerId: overrides?.stripeCustomerId ?? getStripeId(subscription.customer),
    stripeSubscriptionId: overrides?.stripeSubscriptionId ?? subscription.id,
    stripePriceId: overrides?.stripePriceId ?? subscription.items.data[0]?.price?.id ?? null,
    stripeSubscriptionStatus: overrides?.stripeSubscriptionStatus ?? subscription.status,
    cancelAtPeriodEnd: overrides?.cancelAtPeriodEnd ?? subscription.cancel_at_period_end,
    currentPeriodStart: overrides?.currentPeriodStart ?? toIsoFromUnixTimestamp(subscription.current_period_start),
    currentPeriodEnd: overrides?.currentPeriodEnd ?? toIsoFromUnixTimestamp(subscription.current_period_end),
    lastInvoiceId: overrides?.lastInvoiceId ?? getStripeId(subscription.latest_invoice),
    lastInvoiceStatus: overrides?.lastInvoiceStatus ?? null,
    lastPaymentFailedAt: overrides?.lastPaymentFailedAt ?? null,
  };
}

async function retrieveSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice", "items.data.price"],
  });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") {
    return;
  }

  const subscriptionId = getStripeId(session.subscription);
  const customerId = getStripeId(session.customer);
  const userId =
    session.client_reference_id ??
    session.metadata?.supabase_user_id ??
    await resolveUserIdFromBilling({
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
    });

  if (!subscriptionId || !userId) {
    throw new Error("Webhook checkout.session.completed missing subscription or user reference");
  }

  const subscription = await retrieveSubscription(subscriptionId);

  await upsertBilling(buildSubscriptionBillingUpdate(userId, subscription, {
    planTier: "premium",
    accessState: "premium_active",
    stripeCustomerId: customerId ?? getStripeId(subscription.customer),
    lastInvoiceStatus: "paid",
    lastPaymentFailedAt: null,
  }));
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getStripeId(invoice.subscription);
  const customerId = getStripeId(invoice.customer);

  if (!subscriptionId) {
    return;
  }

  const subscription = await retrieveSubscription(subscriptionId);
  const userId =
    subscription.metadata.supabase_user_id ??
    await resolveUserIdFromBilling({
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
    });

  if (!userId) {
    throw new Error("Webhook invoice.payment_succeeded missing user reference");
  }

  await upsertBilling(buildSubscriptionBillingUpdate(userId, subscription, {
    planTier: "premium",
    accessState: "premium_active",
    stripeCustomerId: customerId ?? getStripeId(subscription.customer),
    lastInvoiceId: invoice.id,
    lastInvoiceStatus: invoice.status ?? "paid",
    lastPaymentFailedAt: null,
  }));
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getStripeId(invoice.subscription);
  const customerId = getStripeId(invoice.customer);

  if (!subscriptionId) {
    return;
  }

  const subscription = await retrieveSubscription(subscriptionId);
  const userId =
    subscription.metadata.supabase_user_id ??
    await resolveUserIdFromBilling({
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
    });

  if (!userId) {
    throw new Error("Webhook invoice.payment_failed missing user reference");
  }

  await upsertBilling(buildSubscriptionBillingUpdate(userId, subscription, {
    planTier: "premium",
    accessState: "past_due",
    stripeCustomerId: customerId ?? getStripeId(subscription.customer),
    stripeSubscriptionStatus: subscription.status || "past_due",
    lastInvoiceId: invoice.id,
    lastInvoiceStatus: invoice.status ?? "open",
    lastPaymentFailedAt: toIsoFromUnixTimestamp(invoice.created),
  }));
}

async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = getStripeId(subscription.customer);
  const userId =
    subscription.metadata.supabase_user_id ??
    await resolveUserIdFromBilling({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
    });

  if (!userId) {
    throw new Error("Webhook customer.subscription.deleted missing user reference");
  }

  await upsertBilling(buildSubscriptionBillingUpdate(userId, subscription, {
    planTier: "free",
    accessState: "free",
    stripeCustomerId: customerId,
    stripeSubscriptionStatus: subscription.status,
    cancelAtPeriodEnd: false,
  }));
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "invoice.payment_succeeded":
    case "invoice.paid":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "customer.subscription.deleted":
      await handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const claimed = await rememberEvent(event);

  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    await forgetEvent(event.id);
    console.error("Stripe webhook handling failed:", event.id, event.type, error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
