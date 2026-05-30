import {
  canTransitionJobSiteStatus,
  getInvalidJobSiteStatusTransitionError,
  isValidJobSiteStatus,
  type JobSiteStatus,
} from "@/lib/job-site-status";
import {
  getFirstValidationError,
  hasValidDateRange,
  normalizeTrimmedString,
  validateRequiredTrimmedString,
} from "@/lib/validation";

export const JOB_SITE_CLIENT_REQUIRED_ERROR = "Please select a client";
export const JOB_SITE_TITLE_REQUIRED_ERROR = "Title is required";
export const JOB_SITE_ADDRESS_REQUIRED_ERROR = "Address is required";
export const JOB_SITE_INVALID_STATUS_ERROR = "Invalid status";
export const JOB_SITE_DATE_RANGE_ERROR = "Start date must be before end date";

export type JobSiteValidationErrors = {
  client_id?: string;
  title?: string;
  address?: string;
  dates?: string;
  status?: string;
};

export function validateJobSiteInput(
  input: {
    client_id?: unknown;
    title: unknown;
    address: unknown;
    start_date?: unknown;
    end_date?: unknown;
    status?: unknown;
  },
  options: {
    requireClient?: boolean;
    currentStatus?: JobSiteStatus;
    transitionErrorFormat?: "label" | "value";
  } = {},
): JobSiteValidationErrors {
  const errors: JobSiteValidationErrors = {};

  if (options.requireClient) {
    const clientError = validateRequiredTrimmedString(input.client_id, JOB_SITE_CLIENT_REQUIRED_ERROR);
    if (clientError) {
      errors.client_id = clientError;
    }
  }

  const titleError = validateRequiredTrimmedString(input.title, JOB_SITE_TITLE_REQUIRED_ERROR);
  if (titleError) {
    errors.title = titleError;
  }

  const addressError = validateRequiredTrimmedString(input.address, JOB_SITE_ADDRESS_REQUIRED_ERROR);
  if (addressError) {
    errors.address = addressError;
  }

  const startDate = normalizeTrimmedString(input.start_date);
  const endDate = normalizeTrimmedString(input.end_date);
  if (!hasValidDateRange(startDate, endDate)) {
    errors.dates = JOB_SITE_DATE_RANGE_ERROR;
  }

  const rawStatus = input.status;
  const hasStatus = rawStatus !== undefined && rawStatus !== null && rawStatus !== "";

  if (hasStatus && !isValidJobSiteStatus(rawStatus)) {
    errors.status = JOB_SITE_INVALID_STATUS_ERROR;
    return errors;
  }

  if (
    options.currentStatus &&
    hasStatus &&
    rawStatus !== options.currentStatus &&
    !canTransitionJobSiteStatus(options.currentStatus, rawStatus)
  ) {
    errors.status = getInvalidJobSiteStatusTransitionError(
      options.currentStatus,
      rawStatus,
      options.transitionErrorFormat,
    );
  }

  return errors;
}

export function getJobSiteValidationError(
  input: {
    client_id?: unknown;
    title: unknown;
    address: unknown;
    start_date?: unknown;
    end_date?: unknown;
    status?: unknown;
  },
  options: {
    requireClient?: boolean;
    currentStatus?: JobSiteStatus;
    transitionErrorFormat?: "label" | "value";
  } = {},
): string | null {
  return getFirstValidationError(validateJobSiteInput(input, options));
}

export function normalizeJobSiteInput(input: {
  client_id?: unknown;
  title: unknown;
  address: unknown;
  start_date?: unknown;
  end_date?: unknown;
  status?: unknown;
  notes?: unknown;
}) {
  return {
    client_id: normalizeTrimmedString(input.client_id),
    title: normalizeTrimmedString(input.title) ?? "",
    address: normalizeTrimmedString(input.address) ?? "",
    start_date: normalizeTrimmedString(input.start_date),
    end_date: normalizeTrimmedString(input.end_date),
    status: isValidJobSiteStatus(input.status) ? input.status : null,
    notes: normalizeTrimmedString(input.notes),
  };
}
