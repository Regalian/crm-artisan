import type { JobSiteStatus } from "@/lib/job-site-status";

export const FREE_ACTIVE_JOB_SITE_LIMIT = 5;
export const JOB_SITE_LIMIT_ERROR_CODE = "FREE_TIER_JOB_SITE_LIMIT";
export const JOB_SITE_LIMIT_MESSAGE = "You've hit the free tier limit. Upgrade to Premium for unlimited job sites.";

export function isActiveJobSiteStatus(status: JobSiteStatus | string | null | undefined) {
  return status === "planned" || status === "in_progress";
}

export function countActiveJobSites<T extends { status: JobSiteStatus }>(jobSites: T[]) {
  return jobSites.filter((jobSite) => isActiveJobSiteStatus(jobSite.status)).length;
}

export function isJobSiteLimitErrorMessage(message: string | null | undefined) {
  return typeof message === "string" && message.includes(JOB_SITE_LIMIT_MESSAGE);
}
