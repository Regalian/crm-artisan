import { describe, expect, it } from "vitest";

import {
  canTransitionQuoteStatus,
  getAllowedQuoteStatusTransitions,
  isValidQuoteStatus,
} from "@/lib/quote-status";

describe("quote status validation", () => {
  it("accepts known quote statuses", () => {
    expect(isValidQuoteStatus("draft")).toBe(true);
    expect(isValidQuoteStatus("sent")).toBe(true);
    expect(isValidQuoteStatus("accepted")).toBe(true);
    expect(isValidQuoteStatus("rejected")).toBe(true);
  });

  it("rejects unknown quote statuses", () => {
    expect(isValidQuoteStatus("planned")).toBe(false);
    expect(isValidQuoteStatus("")).toBe(false);
  });

  it("allows only supported transitions", () => {
    expect(canTransitionQuoteStatus("draft", "sent")).toBe(true);
    expect(canTransitionQuoteStatus("sent", "accepted")).toBe(true);
    expect(canTransitionQuoteStatus("sent", "rejected")).toBe(true);
    expect(canTransitionQuoteStatus("sent", "draft")).toBe(true);
    expect(canTransitionQuoteStatus("draft", "accepted")).toBe(false);
    expect(canTransitionQuoteStatus("accepted", "draft")).toBe(false);
  });

  it("lists allowed transitions for a sent quote", () => {
    expect(getAllowedQuoteStatusTransitions("sent")).toEqual([
      "sent",
      "draft",
      "accepted",
      "rejected",
    ]);
  });
});
