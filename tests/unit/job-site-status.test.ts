import { describe, expect, it } from "vitest";

import { canTransitionJobSiteStatus } from "@/lib/job-site-status";

describe("job site status transitions", () => {
  it("allows planned to move to in_progress", () => {
    expect(canTransitionJobSiteStatus("planned", "in_progress")).toBe(true);
  });

  it("allows in_progress to move to completed", () => {
    expect(canTransitionJobSiteStatus("in_progress", "completed")).toBe(true);
  });

  it("blocks completed from moving back to planned", () => {
    expect(canTransitionJobSiteStatus("completed", "planned")).toBe(false);
  });
});
