import type { Metadata } from "next";

import { getQuoteById } from "@/lib/server/quotes";
import QuoteDetailPageClient from "./QuoteDetailPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const quote = await getQuoteById(id);

  return {
    title: `Quote ${quote.quote_number}`,
  };
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuoteById(id);

  return (
    <QuoteDetailPageClient
      key={`${quote.id}:${quote.updated_at}:${quote.status}:${quote.line_items.length}`}
      initialQuote={quote}
    />
  );
}
