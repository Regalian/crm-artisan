import { isValidJobSiteStatus } from "@/lib/job-site-status";
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
    const clientId = searchParams.get("client_id");

    let query = supabase
      .from("job_sites")
      .select(`
        *,
        client:clients(id, name),
        quotes_count:quotes(count)
      `)
      .order("created_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data: jobSites, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch job sites" }, { status: 500 });
    }

    return NextResponse.json({ job_sites: jobSites }, { status: 200 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { client_id, title, address, start_date, end_date, status, notes } = body;

    // Validate required fields
    if (!client_id) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }
    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!address || typeof address !== "string" || address.trim() === "") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Validate client belongs to user
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, user_id")
      .eq("id", client_id)
      .eq("user_id", userId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const hasStatus = status !== undefined && status !== null;
    if (hasStatus && !isValidJobSiteStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Validate dates
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
    }

    const { data: jobSite, error: insertError } = await supabase
      .from("job_sites")
      .insert({
        client_id,
        title: title.trim(),
        address: address.trim(),
        start_date: start_date || null,
        end_date: end_date || null,
        status: hasStatus ? status : "planned",
        notes: notes?.trim() || null,
      })
      .select(`
        *,
        client:clients(id, name)
      `)
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
      return NextResponse.json({ error: "Failed to create job site" }, { status: 500 });
    }

    return NextResponse.json({ job_site: jobSite }, { status: 201 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
