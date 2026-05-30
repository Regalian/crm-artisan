import { describe, expect, it } from "vitest";

import { validateJobSiteInput } from "@/lib/job-site-validation";

describe("job site validation", () => {
  it("requires client, title, and address when creating a job site", () => {
    expect(
      validateJobSiteInput(
        { client_id: "", title: "", address: "" },
        { requireClient: true },
      ),
    ).toEqual({
      client_id: "Please select a client",
      title: "Title is required",
      address: "Address is required",
    });
  });

  it("blocks an invalid date range", () => {
    expect(
      validateJobSiteInput({
        client_id: "client-1",
        title: "Kitchen refit",
        address: "1 High Street",
        start_date: "2026-06-10",
        end_date: "2026-06-01",
      }),
    ).toEqual({ dates: "Start date must be before end date" });
  });

  it("allows valid job site status transitions", () => {
    expect(
      validateJobSiteInput(
        {
          client_id: "client-1",
          title: "Kitchen refit",
          address: "1 High Street",
          status: "in_progress",
        },
        { currentStatus: "planned", transitionErrorFormat: "label" },
      ),
    ).toEqual({});
  });

  it("returns a label-based status transition error for the UI", () => {
    expect(
      validateJobSiteInput(
        {
          client_id: "client-1",
          title: "Kitchen refit",
          address: "1 High Street",
          status: "planned",
        },
        { currentStatus: "completed", transitionErrorFormat: "label" },
      ),
    ).toEqual({ status: "Cannot change status from Completed to Planned" });
  });
});
