"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function QuoteDetailError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorState
      title="Could not load quote"
      message="Something went wrong while loading this quote. Please try again."
      onRetry={() => unstable_retry()}
    />
  );
}
