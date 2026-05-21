import { describe, expect, it } from "vitest";

import {
  CLIENT_PHONE_REQUIRED_ERROR,
  validateClientInput,
} from "@/lib/client-validation";

describe("client validation", () => {
  it("requires name and email for API input", () => {
    expect(validateClientInput({ name: "", email: "" })).toEqual({
      name: "Name is required",
      email: "Email is required",
    });
  });

  it("requires phone for form input when configured", () => {
    expect(
      validateClientInput(
        { name: "Jane", phone: "", email: "jane@example.com" },
        { requirePhone: true },
      ),
    ).toEqual({ phone: CLIENT_PHONE_REQUIRED_ERROR });
  });

  it("accepts a complete client payload", () => {
    expect(
      validateClientInput(
        { name: "Jane", phone: "07700 900123", email: "jane@example.com" },
        { requirePhone: true },
      ),
    ).toEqual({});
  });
});
