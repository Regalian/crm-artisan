import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}
