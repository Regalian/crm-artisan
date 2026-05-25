import type { Metadata } from "next";

import { getClients } from "@/lib/server/clients";
import { getJobSites } from "@/lib/server/job-sites";
import { getQuotes } from "@/lib/server/quotes";
import QuotesPageClient from "./QuotesPageClient";

export const metadata: Metadata = {
  title: "Quotes",
};

export default async function QuotesPage() {
  const [quotes, clients, jobSites] = await Promise.all([
    getQuotes(),
    getClients(),
    getJobSites(),
  ]);

  return (
    <QuotesPageClient
      initialQuotes={quotes}
      hasClients={clients.length > 0}
      hasJobSites={jobSites.length > 0}
    />
  );
}
