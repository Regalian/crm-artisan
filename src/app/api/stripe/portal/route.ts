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

    const { data: billing, error: billingError } = await supabase
      .from("account_billing")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (billingError) {
      throw billingError;
    }

    if (!billing?.stripe_customer_id) {
      return NextResponse.redirect(new URL("/billing?portalError=true", request.url), 303);
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrlFromRequest(request);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID || undefined,
      return_url: `${siteUrl}/billing`,
    });

    return NextResponse.redirect(portalSession.url, 303);
  } catch (error) {
    console.error("Stripe billing portal session creation failed:", error);
    return NextResponse.redirect(new URL("/billing?portalError=true", request.url), 303);
  }
}
