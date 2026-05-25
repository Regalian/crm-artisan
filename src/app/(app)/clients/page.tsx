import type { Metadata } from "next";

import { getClients } from "@/lib/server/clients";
import ClientsPageClient from "./ClientsPageClient";

export const metadata: Metadata = {
  title: "Clients",
};

export default async function ClientsPage() {
  const clients = await getClients();

  return <ClientsPageClient initialClients={clients} />;
}
