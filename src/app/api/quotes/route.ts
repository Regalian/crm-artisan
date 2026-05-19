import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function getUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const jobSiteId = searchParams.get("job_site_id");

    // Step 1: Get client IDs for this user
    const { data: userClients, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId);

    if (clientError) {
      console.error("Database error:", clientError);
      return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
    }

    const userClientIds = (userClients || []).map((c) => c.id);

    if (userClientIds.length === 0) {
      return NextResponse.json({ quotes: [] }, { status: 200 });
    }

    // Step 2: Get job_site IDs for those clients
    const { data: userJobSites, error: jsError } = await supabase
      .from("job_sites")
      .select("id")
      .in("client_id", userClientIds);

    if (jsError) {
      console.error("Database error:", jsError);
      return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
    }

    const userJobSiteIds = (userJobSites || []).map((js) => js.id);

    if (userJobSiteIds.length === 0) {
      return NextResponse.json({ quotes: [] }, { status: 200 });
    }

    // Step 3: Fetch quotes for those job sites
    let query = supabase
      .from("quotes")
      .select(`
        *,
        line_items:quote_line_items(*),
        job_site:job_sites(id, title, client:clients(id, name))
      `)
      .in("job_site_id", userJobSiteIds)
      .order("created_at", { ascending: false });

    if (jobSiteId) {
      query = query.eq("job_site_id", jobSiteId);
    }

    const { data: quotes, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
    }

    // Filter by status if provided
    const filtered = status ? (quotes || []).filter((q) => q.status === status) : (quotes || []);

    return NextResponse.json({ quotes: filtered }, { status: 200 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
