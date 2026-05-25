const statusConfig = [
  { key: "draft", label: "Draft", accent: "bg-zinc-500" },
  { key: "sent", label: "Sent", accent: "bg-blue-500" },
  { key: "accepted", label: "Accepted", accent: "bg-green-500" },
  { key: "rejected", label: "Rejected", accent: "bg-red-500" },
] as const;

export function QuoteStatusBreakdown({
  counts,
}: {
  counts: Record<(typeof statusConfig)[number]["key"], number>;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Quotes by Status</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">A quick view of what still needs chasing.</p>
        </div>
      </div>

      <div className="space-y-3">
        {statusConfig.map((status) => (
          <div key={status.key} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${status.accent}`} />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{status.label}</span>
            </div>
            <span className="text-lg font-semibold text-zinc-900 dark:text-white">{counts[status.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
