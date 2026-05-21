export const JOB_SITE_STATUSES = ["planned", "in_progress", "completed"] as const;

export type JobSiteStatus = (typeof JOB_SITE_STATUSES)[number];

export const JOB_SITE_STATUS_LABELS: Record<JobSiteStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
};

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

export function getJobSiteStatusLabel(status: JobSiteStatus): string {
  return JOB_SITE_STATUS_LABELS[status];
}

export function getInvalidJobSiteStatusTransitionError(
  currentStatus: JobSiteStatus,
  nextStatus: JobSiteStatus,
  format: "label" | "value" = "value",
): string {
  if (format === "label") {
    return `Cannot change status from ${getJobSiteStatusLabel(currentStatus)} to ${getJobSiteStatusLabel(nextStatus)}`;
  }

  return `Invalid status transition from ${currentStatus} to ${nextStatus}`;
}
