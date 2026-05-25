import type { Metadata } from "next";

import { getJobSiteById } from "@/lib/server/job-sites";
import CreateQuotePageClient from "./CreateQuotePageClient";

export const metadata: Metadata = {
  title: "New Quote",
};

export default async function CreateQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobSite = await getJobSiteById(id);

  return <CreateQuotePageClient initialJobSite={jobSite} />;
}
