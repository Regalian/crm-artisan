import { requireAuthenticatedUser } from "@/lib/server/auth";

export type DashboardSummary = {
  activeJobSitesCount: number;
  acceptedValueThisMonth: number;
  clientsCount: number;
  quotesDraftCount: number;
  quotesSentCount: number;
  quotesAcceptedCount: number;
  quotesRejectedCount: number;
};

export type RecentActivityItem = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, string | number | boolean | null>;
  occurredAt: string;
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return 0;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { supabase } = await requireAuthenticatedUser();
  const { data, error } = await supabase.rpc("get_dashboard_summary");

  if (error) {
    throw error;
  }

  const summaryRow = Array.isArray(data) ? data[0] : data;

  return {
    activeJobSitesCount: toNumber(summaryRow?.active_job_sites_count),
    acceptedValueThisMonth: toNumber(summaryRow?.accepted_value_this_month),
    clientsCount: toNumber(summaryRow?.clients_count),
    quotesDraftCount: toNumber(summaryRow?.quotes_draft_count),
    quotesSentCount: toNumber(summaryRow?.quotes_sent_count),
    quotesAcceptedCount: toNumber(summaryRow?.quotes_accepted_count),
    quotesRejectedCount: toNumber(summaryRow?.quotes_rejected_count),
  };
}

export async function getRecentActivity(limit = 5): Promise<RecentActivityItem[]> {
  const { supabase } = await requireAuthenticatedUser();
  const { data, error } = await supabase.rpc("get_recent_activity", { limit_count: limit });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item: {
    id: string;
    event_type: string;
    entity_type: string;
    entity_id: string;
    metadata: Record<string, string | number | boolean | null> | null;
    occurred_at: string;
  }) => ({
    id: item.id,
    eventType: item.event_type,
    entityType: item.entity_type,
    entityId: item.entity_id,
    metadata: (item.metadata ?? {}) as Record<string, string | number | boolean | null>,
    occurredAt: item.occurred_at,
  }));
}
