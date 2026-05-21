import { describe, expect, it } from "vitest";

import { isValidEmail } from "@/lib/validation";

describe("email validation", () => {
  it("passes for a valid email format", () => {
    expect(isValidEmail("valid@example.com")).toBe(true);
  });

  it("fails when the email is missing @", () => {
    expect(isValidEmail("invalid.example.com")).toBe(false);
  });

  it("fails when the email contains double @", () => {
    expect(isValidEmail("a@@b.com")).toBe(false);
  });

  it("fails when the email contains spaces", () => {
    expect(isValidEmail("a b@example.com")).toBe(false);
  });

  it("fails when the email is empty", () => {
    expect(isValidEmail("")).toBe(false);
  });
});
