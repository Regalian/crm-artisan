import type { Metadata } from "next";

import { getClients } from "@/lib/server/clients";
import { getJobSites } from "@/lib/server/job-sites";
import JobSitesPageClient from "./JobSitesPageClient";

export const metadata: Metadata = {
  title: "Job Sites",
};

export default async function JobSitesPage() {
  const [jobSites, clients] = await Promise.all([getJobSites(), getClients()]);

  return <JobSitesPageClient initialJobSites={jobSites} availableClients={clients} />;
}
