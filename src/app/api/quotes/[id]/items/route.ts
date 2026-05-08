import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const DEV_USER_ID = process.env.DEV_USER_ID;

async function getUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null | undefined> {
  if (DEV_USER_ID) return DEV_USER_ID;
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
    let userId = await getUserId(supabase);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await verifyQuoteAccess(supabase, id, userId);
    if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: items, error } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch line items" }, { status: 500 });
    }

    return NextResponse.json({ items }, { status: 200 });
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

    const hasAccess = await verifyQuoteAccess(supabase, id, userId);
    if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isEditable = await isQuoteEditable(supabase, id);
    if (!isEditable) {
      return NextResponse.json({ error: "Cannot add items to a sent quote. Revert to draft first." }, { status: 403 });
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

    const { data: item, error: insertError } = await supabase
      .from("quote_line_items")
      .insert({
        quote_id: id,
        description: description.trim(),
        quantity,
        unit_price,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
      return NextResponse.json({ error: "Failed to add line item" }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
