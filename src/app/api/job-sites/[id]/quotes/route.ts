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

    const { data: quotes, error } = await supabase
      .from("quotes")
      .select(`
        *,
        line_items:quote_line_items(*)
      `)
      .eq("job_site_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
    }

    return NextResponse.json({ quotes }, { status: 200 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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
    const { date, status, notes, line_items } = body;

    // Validate status if provided
    const validStatuses = ["draft", "sent", "accepted", "rejected"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Generate quote number using the database function.
    // The fixed function derives the caller's identity from auth.uid() in the
    // database session — p_user_id has been removed to prevent callers from
    // supplying an arbitrary user id (see SECURITY-AUDIT.MD, Finding 1).
    const { data: quoteNumberData } = await supabase.rpc('get_next_quote_number', {
      p_job_site_id: id,
    });

    // Normalize to Q-NNN format (RPC may return PL- or other prefixes)
    let quoteNumber = `Q-${Date.now().toString().slice(-3)}`;
    if (quoteNumberData) {
      const num = quoteNumberData.replace(/^[^-]+-/, '');
      quoteNumber = `Q-${num}`;
    }

    const { data: quote, error: insertError } = await supabase
      .from("quotes")
      .insert({
        job_site_id: id,
        quote_number: quoteNumber,
        date: date || new Date().toISOString().split('T')[0],
        status: status || "draft",
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
      return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
    }

    // Insert line items if provided
    if (line_items && Array.isArray(line_items) && line_items.length > 0) {
      const lineItemsToInsert = line_items.map((item: { description: string; quantity: number; unit_price: number; sort_order?: number }, index: number) => ({
        quote_id: quote.id,
        description: item.description.trim(),
        quantity: item.quantity,
        unit_price: item.unit_price,
        sort_order: item.sort_order ?? index,
      }));

      const { error: itemsError } = await supabase
        .from("quote_line_items")
        .insert(lineItemsToInsert);

      if (itemsError) {
        console.error("Line items error:", itemsError);
        // Rollback: delete the quote
        await supabase.from("quotes").delete().eq("id", quote.id);
        return NextResponse.json({ error: "Failed to create quote with line items" }, { status: 500 });
      }
    }

    // Fetch the complete quote with line items
    const { data: completeQuote } = await supabase
      .from("quotes")
      .select(`
        *,
        line_items:quote_line_items(*)
      `)
      .eq("id", quote.id)
      .single();

    return NextResponse.json({ quote: completeQuote }, { status: 201 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
