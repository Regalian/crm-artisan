import type { Metadata } from "next";

import { getQuotes } from "@/lib/server/quotes";
import QuotesPageClient from "./QuotesPageClient";

export const metadata: Metadata = {
  title: "Quotes",
};

export default async function QuotesPage() {
  const quotes = await getQuotes();

  return <QuotesPageClient initialQuotes={quotes} />;
}
