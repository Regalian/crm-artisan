export const runtime = "nodejs";

import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { QuotePdfDocument } from "@/app/components/QuotePdf";
import { calculateQuoteTotal } from "@/lib/quotes";

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

    // Fetch the full quote with line items and related data
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

    const total = calculateQuoteTotal(quote.line_items || []);

    // Normalize client data (FK joins return objects, not arrays)
    const normalizedQuote = {
      quote_number: quote.quote_number,
      date: quote.date,
      notes: quote.notes,
      line_items: (quote.line_items || [])
        .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
        .map((item: { description: string; quantity: number; unit_price: number }) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      job_site: {
        title: quote.job_site?.title ?? "",
        address: quote.job_site?.address ?? "",
        client: {
          name: quote.job_site?.client?.name ?? "Unknown",
          phone: quote.job_site?.client?.phone ?? null,
          email: quote.job_site?.client?.email ?? null,
        },
      },
    };

    // Generate PDF
    const pdfDoc = pdf(<QuotePdfDocument quote={normalizedQuote} total={total} />);
    const blob = await pdfDoc.toBlob();

    // Convert Blob to Buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${normalizedQuote.quote_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
