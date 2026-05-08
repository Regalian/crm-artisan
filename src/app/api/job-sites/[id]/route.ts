import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const DEV_USER_ID = process.env.DEV_USER_ID;

async function getUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null | undefined> {
  if (DEV_USER_ID) return DEV_USER_ID;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

async function verifyJobSiteAccess(supabase: Awaited<ReturnType<typeof createClient>>, jobSiteId: string, userId: string | null | undefined): Promise<boolean> {
  const { data: jobSite } = await supabase
    .from("job_sites")
    .select("id, client:clients(id, user_id)")
    .eq("id", jobSiteId)
    .single();

  // client is an array in the response, need to access it as array[0]
  const clientData = Array.isArray(jobSite?.client) ? jobSite?.client[0] : jobSite?.client;
  return clientData?.user_id === userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    let userId = await getUserId(supabase);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await verifyJobSiteAccess(supabase, id, userId);
    if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: jobSite, error } = await supabase
      .from("job_sites")
      .select(`
        *,
        client:clients(id, name, phone, email),
        quotes:quotes(
          *,
          line_items:quote_line_items(*)
        )
      `)
      .eq("id", id)
      .single();

    if (error || !jobSite) {
      return NextResponse.json({ error: "Job site not found" }, { status: 404 });
    }

    return NextResponse.json({ job_site: jobSite });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    let userId = await getUserId(supabase);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await verifyJobSiteAccess(supabase, id, userId);
    if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { title, address, start_date, end_date, status, notes } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!address || typeof address !== "string" || address.trim() === "") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const validStatuses = ["planned", "in_progress", "completed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
    }

    const { data: jobSite, error } = await supabase
      .from("job_sites")
      .update({
        title: title.trim(),
        address: address.trim(),
        start_date: start_date || null,
        end_date: end_date || null,
        status: status || "planned",
        notes: notes?.trim() || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: "Failed to update job site" }, { status: 500 });
    }

    return NextResponse.json({ job_site: jobSite });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    let userId = await getUserId(supabase);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await verifyJobSiteAccess(supabase, id, userId);
    if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Check if job site has any quotes - block deletion if so
    const { count: quotesCount } = await supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("job_site_id", id);

    if (quotesCount && quotesCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete job site with ${quotesCount} quote${quotesCount !== 1 ? 's' : ''}. Delete quotes first.` },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("job_sites")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json({ error: "Failed to delete job site" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
