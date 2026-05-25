import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  LayoutDashboard,
  MapPin,
  Send,
  ThumbsDown,
  Users,
} from "lucide-react";

import type { RecentActivityItem } from "@/lib/server/dashboard";

function getActivityPresentation(activity: RecentActivityItem) {
  const metadata = activity.metadata ?? {};

  switch (activity.eventType) {
    case "client_created":
      return {
        icon: <Users size={18} />,
        text: `New client added: ${metadata.client_name ?? "Client"}`,
        href: "/clients",
      };
    case "job_site_created":
      return {
        icon: <MapPin size={18} />,
        text: `New job site added: ${metadata.job_site_title ?? "Job site"}`,
        href: "/job-sites",
      };
    case "job_site_updated":
      return {
        icon: <LayoutDashboard size={18} />,
        text: `Job site updated: ${metadata.job_site_title ?? "Job site"}`,
        href: "/job-sites",
      };
    case "quote_created":
      return {
        icon: <FileText size={18} />,
        text: `New quote created: ${metadata.quote_number ?? "Quote"}`,
        href: "/quotes",
      };
    case "quote_sent":
      return {
        icon: <Send size={18} />,
        text: `Quote sent: ${metadata.quote_number ?? "Quote"}`,
        href: "/quotes",
      };
    case "quote_accepted":
      return {
        icon: <CheckCircle2 size={18} />,
        text: `Quote accepted: ${metadata.quote_number ?? "Quote"}`,
        href: "/quotes",
      };
    case "quote_rejected":
      return {
        icon: <ThumbsDown size={18} />,
        text: `Quote rejected: ${metadata.quote_number ?? "Quote"}`,
        href: "/quotes",
      };
    case "quote_reverted_to_draft":
      return {
        icon: <FileText size={18} />,
        text: `Quote reopened as draft: ${metadata.quote_number ?? "Quote"}`,
        href: "/quotes",
      };
    default:
      return {
        icon: <FileText size={18} />,
        text: "Activity updated",
        href: "/dashboard",
      };
  }
}

function formatRelativeTime(dateString: string) {
  const now = Date.now();
  const time = new Date(dateString).getTime();
  const diffMinutes = Math.max(1, Math.round((now - time) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function RecentActivityList({ activities }: { activities: RecentActivityItem[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Recent Activity</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">The last 5 things that changed in your CRM.</p>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No activity yet. Add a client or create a quote to get started.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity) => {
            const presentation = getActivityPresentation(activity);

            return (
              <li key={activity.id}>
                <Link
                  href={presentation.href}
                  className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="mt-0.5 rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {presentation.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{presentation.text}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{formatRelativeTime(activity.occurredAt)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
