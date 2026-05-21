export const JOB_SITE_STATUSES = ["planned", "in_progress", "completed"] as const;

export type JobSiteStatus = (typeof JOB_SITE_STATUSES)[number];

const ALLOWED_JOB_SITE_STATUS_TRANSITIONS: Record<JobSiteStatus, readonly JobSiteStatus[]> = {
  planned: ["planned", "in_progress"],
  in_progress: ["in_progress", "completed"],
  completed: ["completed"],
};

export function isValidJobSiteStatus(value: unknown): value is JobSiteStatus {
  return typeof value === "string" && JOB_SITE_STATUSES.includes(value as JobSiteStatus);
}

export function canTransitionJobSiteStatus(
  currentStatus: JobSiteStatus,
  nextStatus: JobSiteStatus,
): boolean {
  return ALLOWED_JOB_SITE_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function getAllowedJobSiteStatusTransitions(
  currentStatus: JobSiteStatus,
): readonly JobSiteStatus[] {
  return ALLOWED_JOB_SITE_STATUS_TRANSITIONS[currentStatus];
}
