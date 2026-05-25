"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function QuotesError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorState
      title="Could not load quotes"
      message="Something went wrong while loading your quotes. Please try again."
      onRetry={() => unstable_retry()}
    />
  );
}
