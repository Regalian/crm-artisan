import { NextResponse } from "next/server";

import { getSiteUrlFromRequest } from "@/lib/stripe/site-url";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url), 303);
    }

    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;

    if (!priceId) {
      throw new Error("Missing STRIPE_PREMIUM_PRICE_ID");
    }

    const { data: billing, error: billingError } = await supabase
      .from("account_billing")
      .select("plan_tier, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (billingError) {
      throw billingError;
    }

    if (billing?.plan_tier === "premium") {
      return NextResponse.redirect(new URL("/dashboard", request.url), 303);
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrlFromRequest(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      customer: billing?.stripe_customer_id ?? undefined,
      customer_email: billing?.stripe_customer_id ? undefined : user.email ?? undefined,
      client_reference_id: user.id,
      success_url: `${siteUrl}/dashboard?upgraded=true`,
      cancel_url: `${siteUrl}/dashboard`,
      metadata: {
        source: "dashboard_upgrade_button",
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          source: "dashboard_upgrade_button",
          supabase_user_id: user.id,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe Checkout session did not return a url");
    }

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("Stripe Checkout session creation failed:", error);
    return NextResponse.redirect(new URL("/dashboard?billingError=true", request.url), 303);
  }
}
