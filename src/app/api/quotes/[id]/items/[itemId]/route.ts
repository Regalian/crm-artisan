import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function getUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null | undefined> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}

async function verifyQuoteAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  quoteId: string,
  userId: string | null | undefined,
): Promise<boolean> {
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, job_site:job_sites(id, client:clients(id, user_id))")
    .eq("id", quoteId)
    .single();

  const jobSiteData = Array.isArray(quote?.job_site) ? quote?.job_site[0] : quote?.job_site;
  const clientData = Array.isArray(jobSiteData?.client) ? jobSiteData?.client[0] : jobSiteData?.client;
  return clientData?.user_id === userId;
}

async function isQuoteEditable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  quoteId: string,
): Promise<boolean> {
  const { data: quote } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .single();

  return quote?.status === "draft";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id, itemId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await verifyQuoteAccess(supabase, id, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isEditable = await isQuoteEditable(supabase, id);
    if (!isEditable) {
      return NextResponse.json({ error: "Cannot edit items on a sent quote. Revert to draft first." }, { status: 403 });
    }

    const body = await request.json();
    const { description, quantity, unit_price, sort_order } = body;

    if (!description || typeof description !== "string" || description.trim() === "") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (!quantity || typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 });
    }
    if (unit_price === undefined || typeof unit_price !== "number" || unit_price < 0) {
      return NextResponse.json({ error: "Unit price is required and must be 0 or greater" }, { status: 400 });
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from("quote_line_items")
      .update({
        description: description.trim(),
        quantity,
        unit_price,
        sort_order: sort_order ?? undefined,
      })
      .eq("id", itemId)
      .eq("quote_id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: "Failed to update line item" }, { status: 500 });
    }

    return NextResponse.json({ item: updatedItem });
  } catch (routeError) {
    console.error("API error:", routeError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id, itemId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await verifyQuoteAccess(supabase, id, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isEditable = await isQuoteEditable(supabase, id);
    if (!isEditable) {
      return NextResponse.json({ error: "Cannot delete items from a sent quote. Revert to draft first." }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from("quote_line_items")
      .delete()
      .eq("id", itemId)
      .eq("quote_id", id);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return NextResponse.json({ error: "Failed to delete line item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (routeError) {
    console.error("API error:", routeError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
