import { describe, expect, it } from "vitest";

import { isValidQuoteStatus } from "@/lib/quote-status";

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
});
