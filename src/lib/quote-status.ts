export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected"] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
};

const ALLOWED_QUOTE_STATUS_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ["draft", "sent"],
  sent: ["sent", "draft", "accepted", "rejected"],
  accepted: ["accepted"],
  rejected: ["rejected"],
};

export function isValidQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === "string" && QUOTE_STATUSES.includes(value as QuoteStatus);
}

export function canTransitionQuoteStatus(
  currentStatus: QuoteStatus,
  nextStatus: QuoteStatus,
): boolean {
  return ALLOWED_QUOTE_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function getAllowedQuoteStatusTransitions(currentStatus: QuoteStatus): readonly QuoteStatus[] {
  return ALLOWED_QUOTE_STATUS_TRANSITIONS[currentStatus];
}

export function getQuoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS_LABELS[status];
}

export function getInvalidQuoteStatusTransitionError(
  currentStatus: QuoteStatus,
  nextStatus: QuoteStatus,
  format: "label" | "value" = "value",
): string {
  if (format === "label") {
    return `Cannot change status from ${getQuoteStatusLabel(currentStatus)} to ${getQuoteStatusLabel(nextStatus)}`;
  }

  return `Invalid status transition from ${currentStatus} to ${nextStatus}`;
}
