export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected"] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export function isValidQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === "string" && QUOTE_STATUSES.includes(value as QuoteStatus);
}
