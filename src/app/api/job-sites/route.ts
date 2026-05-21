import {
  getJobSiteValidationError,
  normalizeJobSiteInput,
} from "@/lib/job-site-validation";
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
    const validationError = getJobSiteValidationError(body, { requireClient: true });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const normalizedInput = normalizeJobSiteInput(body);

    // Validate client belongs to user
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, user_id")
      .eq("id", normalizedInput.client_id!)
      .eq("user_id", userId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const hasStatus = normalizedInput.status !== null;

    const { data: jobSite, error: insertError } = await supabase
      .from("job_sites")
      .insert({
        client_id: normalizedInput.client_id!,
        title: normalizedInput.title,
        address: normalizedInput.address,
        start_date: normalizedInput.start_date,
        end_date: normalizedInput.end_date,
        status: hasStatus ? normalizedInput.status : "planned",
        notes: normalizedInput.notes,
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
