import { cache } from "react";
import { notFound } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/server/auth";

export async function getQuotes() {
  const { supabase } = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from("quotes")
    .select(`
      *,
      line_items:quote_line_items(*),
      job_site:job_sites(id, title, client:clients(id, name))
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export const getQuoteById = cache(async (id: string) => {
  const { supabase } = await requireAuthenticatedUser();
  const { data, error } = await supabase
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

  if (error || !data) {
    notFound();
  }

  return data;
});
