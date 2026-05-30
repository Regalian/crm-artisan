// @vitest-environment node

import { execFileSync } from "node:child_process";

import { createClient as createSupabaseClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JOB_SITE_LIMIT_MESSAGE } from "@/lib/job-site-limits";
import { SUPABASE_ANON_KEY, SUPABASE_URL, createSession } from "../helpers/supabase-auth";
import { makeUser } from "../helpers/test-users";

type TestSupabaseClient = SupabaseClient & {
  auth: SupabaseClient["auth"] & {
    getUser: () => Promise<{ data: { user: Session["user"] }; error: null }>;
  };
};

function getServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  try {
    const stdout = execFileSync("supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const status = JSON.parse(stdout);

    if (status.SERVICE_ROLE_KEY) {
      return status.SERVICE_ROLE_KEY as string;
    }
  } catch {
    // Fall through to the explicit error below.
  }

  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for job site limit integration tests");
}

let session: Session;
let supabase: TestSupabaseClient;
let admin: SupabaseClient;
let createdClientId: string | null = null;
let createdJobSiteIds: string[] = [];

function createAuthedClient(currentSession: Session): TestSupabaseClient {
  const client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
      },
    },
  }) as TestSupabaseClient;

  client.auth.getUser = async () => ({
    data: { user: currentSession.user },
    error: null,
  });

  return client;
}

async function createOwnedClient() {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: session.user.id,
      name: "Job Site Limit Client",
      phone: "07700 900123",
      email: `limit-${session.user.id}@example.com`,
    })
    .select("id")
    .single();

  expect(error).toBeNull();
  expect(data?.id).toBeTruthy();
  createdClientId = data!.id;
}

async function setBilling(planTier: "free" | "premium", accessState: "free" | "premium_active") {
  const { error } = await admin
    .from("account_billing")
    .update({
      plan_tier: planTier,
      access_state: accessState,
    })
    .eq("user_id", session.user.id);

  expect(error).toBeNull();
}

async function createJobSite(status: "planned" | "in_progress" | "completed", title: string) {
  const result = await supabase
    .from("job_sites")
    .insert({
      client_id: createdClientId,
      title,
      address: `${title} Address`,
      status,
    })
    .select("id, status")
    .single();

  if (result.data?.id) {
    createdJobSiteIds.push(result.data.id);
  }

  return result;
}

beforeEach(async () => {
  const user = makeUser("vitest-job-site-limits", "integration123!");
  session = await createSession(user.email, user.password);
  supabase = createAuthedClient(session);
  admin = createSupabaseClient(SUPABASE_URL, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  createdClientId = null;
  createdJobSiteIds = [];

  await createOwnedClient();
}, 30_000);

afterEach(async () => {
  if (createdJobSiteIds.length > 0) {
    await admin.from("job_sites").delete().in("id", createdJobSiteIds);
  }

  if (createdClientId) {
    await admin.from("clients").delete().eq("id", createdClientId);
  }
}, 10_000);

describe.sequential("Job site free tier limits", () => {
  it("blocks the sixth active job site for free users", async () => {
    for (let index = 1; index <= 5; index += 1) {
      const result = await createJobSite("planned", `Planned Site ${index}`);
      expect(result.error).toBeNull();
    }

    const blocked = await createJobSite("planned", "Blocked Site 6");

    expect(blocked.error).not.toBeNull();
    expect(blocked.error?.message).toContain(JOB_SITE_LIMIT_MESSAGE);
  }, 30_000);

  it("lets premium users create more than five active job sites", async () => {
    await setBilling("premium", "premium_active");

    for (let index = 1; index <= 6; index += 1) {
      const result = await createJobSite("planned", `Premium Site ${index}`);
      expect(result.error).toBeNull();
    }
  }, 30_000);

  it("blocks new active sites after downgrade until the user gets back under the limit", async () => {
    await setBilling("premium", "premium_active");

    for (let index = 1; index <= 6; index += 1) {
      const result = await createJobSite("planned", `Downgrade Site ${index}`);
      expect(result.error).toBeNull();
    }

    await setBilling("free", "free");

    const blocked = await createJobSite("planned", "Blocked After Downgrade");
    expect(blocked.error).not.toBeNull();
    expect(blocked.error?.message).toContain(JOB_SITE_LIMIT_MESSAGE);

    const { error: completeFirstError } = await supabase
      .from("job_sites")
      .update({ status: "completed" })
      .eq("id", createdJobSiteIds[0]);

    expect(completeFirstError).toBeNull();

    const stillBlockedAtFive = await createJobSite("planned", "Still Blocked At Five Active Sites");
    expect(stillBlockedAtFive.error).not.toBeNull();
    expect(stillBlockedAtFive.error?.message).toContain(JOB_SITE_LIMIT_MESSAGE);

    const { error: completeSecondError } = await supabase
      .from("job_sites")
      .update({ status: "completed" })
      .eq("id", createdJobSiteIds[1]);

    expect(completeSecondError).toBeNull();

    const allowed = await createJobSite("planned", "Allowed After Completing Two");
    expect(allowed.error).toBeNull();
  }, 30_000);

  it("allows active-to-active status changes after downgrade because they do not increase capacity", async () => {
    await setBilling("premium", "premium_active");

    for (let index = 1; index <= 6; index += 1) {
      const result = await createJobSite("planned", `Transition Site ${index}`);
      expect(result.error).toBeNull();
    }

    await setBilling("free", "free");

    const updated = await supabase
      .from("job_sites")
      .update({ status: "in_progress" })
      .eq("id", createdJobSiteIds[0])
      .select("id, status")
      .single();

    expect(updated.error).toBeNull();
    expect(updated.data).toMatchObject({
      id: createdJobSiteIds[0],
      status: "in_progress",
    });
  }, 30_000);

  it("blocks reactivating a completed site when that would push a free user over the active limit", async () => {
    for (let index = 1; index <= 5; index += 1) {
      const result = await createJobSite("planned", `Active Site ${index}`);
      expect(result.error).toBeNull();
    }

    const completed = await createJobSite("completed", "Completed Site 6");
    expect(completed.error).toBeNull();

    const reactivated = await supabase
      .from("job_sites")
      .update({ status: "planned" })
      .eq("id", completed.data!.id);

    expect(reactivated.error).not.toBeNull();
    expect(reactivated.error?.message).toContain(JOB_SITE_LIMIT_MESSAGE);
  }, 30_000);
});
