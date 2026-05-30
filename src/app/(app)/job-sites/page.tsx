import type { Metadata } from "next";

import { getClients } from "@/lib/server/clients";
import { getCurrentAccountBilling } from "@/lib/server/billing";
import { getJobSites } from "@/lib/server/job-sites";
import JobSitesPageClient from "./JobSitesPageClient";

export const metadata: Metadata = {
  title: "Job Sites",
};

export default async function JobSitesPage() {
  const [jobSites, clients, billing] = await Promise.all([getJobSites(), getClients(), getCurrentAccountBilling()]);

  return <JobSitesPageClient initialJobSites={jobSites} availableClients={clients} initialBilling={billing} />;
}
