import { isValidJobSiteStatus, type JobSiteStatus } from "@/lib/job-site-status";
import {
  isJobSiteLimitErrorMessage,
  JOB_SITE_LIMIT_ERROR_CODE,
  JOB_SITE_LIMIT_MESSAGE,
} from "@/lib/job-site-limits";
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
    const userId = await getUserId(supabase);
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
    const userId = await getUserId(supabase);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await verifyJobSiteAccess(supabase, id, userId);
    if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const hasStatus = body.status !== undefined && body.status !== null && body.status !== "";
    let currentStatus: JobSiteStatus | undefined;

    if (hasStatus) {
      const { data: currentJobSite, error: currentJobSiteError } = await supabase
        .from("job_sites")
        .select("status")
        .eq("id", id)
        .single();

      if (currentJobSiteError || !currentJobSite || !isValidJobSiteStatus(currentJobSite.status)) {
        return NextResponse.json({ error: "Job site not found" }, { status: 404 });
      }

      currentStatus = currentJobSite.status;
    }

    const validationError = getJobSiteValidationError(body, { currentStatus });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const normalizedInput = normalizeJobSiteInput(body);

    const { data: jobSite, error } = await supabase
      .from("job_sites")
      .update({
        title: normalizedInput.title,
        address: normalizedInput.address,
        start_date: normalizedInput.start_date,
        end_date: normalizedInput.end_date,
        status: hasStatus ? normalizedInput.status ?? undefined : undefined,
        notes: normalizedInput.notes,
      })
      .eq("id", id)
      .select(`
        *,
        client:clients(id, name)
      `)
      .single();

    if (error) {
      console.error("Update error:", error);

      if (isJobSiteLimitErrorMessage(error.message)) {
        return NextResponse.json(
          {
            error: JOB_SITE_LIMIT_MESSAGE,
            code: JOB_SITE_LIMIT_ERROR_CODE,
          },
          { status: 409 },
        );
      }

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
    const userId = await getUserId(supabase);
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
