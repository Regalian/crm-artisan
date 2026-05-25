import { requireAuthenticatedUser } from "@/lib/server/auth";

export async function getClients() {
  const { supabase, user } = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}
