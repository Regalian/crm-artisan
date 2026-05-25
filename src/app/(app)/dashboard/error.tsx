"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function DashboardError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorState
      title="Could not load dashboard"
      message="Something went wrong while loading your totals. Please try again."
      onRetry={() => unstable_retry()}
    />
  );
}
