import { describe, expect, it } from "vitest";

import { calculateQuoteTotal, formatCurrency } from "@/lib/quotes";

describe("quote helpers", () => {
  it("adds all line items and rounds to 2 decimal places", () => {
    expect(
      calculateQuoteTotal([
        { quantity: 10, unit_price: 4.5 },
        { quantity: 20, unit_price: 1.25 },
        { quantity: 8, unit_price: 45 },
      ]),
    ).toBe(430);
  });

  it("returns 0 when there are no line items", () => {
    expect(calculateQuoteTotal([])).toBe(0);
  });

  it("formats GBP currency the same way the UI expects", () => {
    expect(formatCurrency(430)).toBe("£430.00");
  });
});
