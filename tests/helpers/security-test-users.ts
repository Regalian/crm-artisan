import { createClient } from "@supabase/supabase-js";

import { SECURITY_USER_A, SECURITY_USER_B } from "./e2e-users";
import { SUPABASE_ANON_KEY, SUPABASE_URL, signUpUser } from "./supabase-auth";

const UUID_ZERO = "00000000-0000-0000-0000-000000000000";

type AuthFixture = Awaited<ReturnType<typeof signUpUser>>;

function createAuthedRestClient(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

async function clearTenantData(token: string) {
  const supabase = createAuthedRestClient(token);

  for (const table of ["quote_line_items", "quotes", "job_sites", "clients"]) {
    const { error } = await supabase.from(table).delete().neq("id", UUID_ZERO);

    if (error) {
      throw new Error(`Failed to clear ${table} for fixed test user: ${error.message}`);
    }
  }
}

export async function prepareDedicatedSecurityUsers(): Promise<{
  alice: AuthFixture;
  bob: AuthFixture;
}> {
  const [alice, bob] = await Promise.all([
    signUpUser(SECURITY_USER_A.email, SECURITY_USER_A.password),
    signUpUser(SECURITY_USER_B.email, SECURITY_USER_B.password),
  ]);

  await clearTenantData(alice.token);
  await clearTenantData(bob.token);

  return { alice, bob };
}
