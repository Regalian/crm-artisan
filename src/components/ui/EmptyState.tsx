import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-start px-4 pt-10 pb-40 text-center md:justify-center md:py-16 md:pb-16">
      <div className="mb-4 rounded-full bg-zinc-100 p-6 dark:bg-zinc-800">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mb-6 max-w-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {actionLabel && onAction ? <Button size="lg" onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
