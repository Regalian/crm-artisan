import { cache } from "react";
import { notFound } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/server/auth";

export async function getJobSites() {
  const { supabase } = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from("job_sites")
    .select(`
      *,
      client:clients(id, name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export const getJobSiteById = cache(async (id: string) => {
  const { supabase } = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from("job_sites")
    .select(`
      *,
      client:clients(id, name, phone, email)
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  return data;
});
