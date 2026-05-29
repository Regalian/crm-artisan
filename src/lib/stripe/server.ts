import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const apiKey = process.env.STRIPE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing STRIPE_API_KEY");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(apiKey, {
      apiVersion: "2026-04-22.dahlia" as Stripe.LatestApiVersion,
      appInfo: {
        name: "CRM Artisan",
        version: "0.1.0",
      },
    });
  }

  return stripeClient;
}
