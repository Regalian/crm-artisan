import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const DEV_USER_ID = process.env.DEV_USER_ID;

async function getUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null | undefined> {
  if (DEV_USER_ID) return DEV_USER_ID;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    let userId = await getUserId(supabase);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const jobSiteId = searchParams.get("job_site_id");

    let query = supabase
      .from("quotes")
      .select(`
        *,
        line_items:quote_line_items(*),
        job_site:job_sites(id, title, client:clients(id, name))
      `)
      .order("created_at", { ascending: false });

    if (jobSiteId) {
      query = query.eq("job_site_id", jobSiteId);
    }

    // Filter by user ownership via job_site -> client -> user_id
    // We'll filter client-side since Supabase doesn't support nested eq in this pattern
    const { data: quotes, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
    }

    // Filter to user-owned quotes
    const userQuotes = quotes.filter((q) => {
      const jobSite = Array.isArray(q.job_site) ? q.job_site[0] : q.job_site;
      const client = Array.isArray(jobSite?.client) ? jobSite?.client[0] : jobSite?.client;
      return client?.user_id === userId;
    });

    // Filter by status if provided
    const filtered = status ? userQuotes.filter((q) => q.status === status) : userQuotes;

    return NextResponse.json({ quotes: filtered }, { status: 200 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
