import { isValidQuoteStatus } from "@/lib/quote-status";
import { normalizeTrimmedString } from "@/lib/validation";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function getUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

async function verifyQuoteAccess(supabase: Awaited<ReturnType<typeof createClient>>, quoteId: string, userId: string | null | undefined): Promise<boolean> {
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, job_site:job_sites(id, client:clients(id, user_id))")
    .eq("id", quoteId)
    .single();

  const jobSiteData = Array.isArray(quote?.job_site) ? quote?.job_site[0] : quote?.job_site;
  const clientData = Array.isArray(jobSiteData?.client) ? jobSiteData?.client[0] : jobSiteData?.client;
  return clientData?.user_id === userId;
}

async function isQuoteEditable(supabase: Awaited<ReturnType<typeof createClient>>, quoteId: string): Promise<boolean> {
  const { data: quote } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .single();

  return quote?.status === "draft";
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

    const hasAccess = await verifyQuoteAccess(supabase, id, userId);
    if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: quote, error } = await supabase
      .from("quotes")
      .select(`
        *,
        line_items:quote_line_items(*),
        job_site:job_sites(
          id,
          title,
          address,
          client:clients(id, name, phone, email)
        )
      `)
      .eq("id", id)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json({ quote });
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

    const hasAccess = await verifyQuoteAccess(supabase, id, userId);
    if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isEditable = await isQuoteEditable(supabase, id);
    if (!isEditable) {
      return NextResponse.json({ error: "Cannot edit a sent quote. Revert to draft first." }, { status: 403 });
    }

    const body = await request.json();
    const { date, status, notes } = body;

    const hasStatus = status !== undefined && status !== null && status !== "";
    if (hasStatus && !isValidQuoteStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: quote, error } = await supabase
      .from("quotes")
      .update({
        date: date || undefined,
        status: hasStatus ? status : undefined,
        notes: notes !== undefined ? normalizeTrimmedString(notes) : undefined,
      })
      .eq("id", id)
      .select(`
        *,
        line_items:quote_line_items(*)
      `)
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
    }

    return NextResponse.json({ quote });
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

    const hasAccess = await verifyQuoteAccess(supabase, id, userId);
    if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete line items first (should cascade but being explicit)
    await supabase.from("quote_line_items").delete().eq("quote_id", id);

    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Revert quote to draft
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await verifyQuoteAccess(supabase, id, userId);
    if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    
    // Handle revert to draft
    if (body.action === "revert") {
      const { data: quote, error } = await supabase
        .from("quotes")
        .update({ status: "draft" })
        .eq("id", id)
        .eq("status", "sent")
        .select()
        .single();

      if (error) {
        console.error("Revert error:", error);
        return NextResponse.json({ error: "Failed to revert quote. Only sent quotes can be reverted." }, { status: 400 });
      }

      if (!quote) {
        return NextResponse.json({ error: "Quote is not in 'sent' status" }, { status: 400 });
      }

      return NextResponse.json({ quote });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
