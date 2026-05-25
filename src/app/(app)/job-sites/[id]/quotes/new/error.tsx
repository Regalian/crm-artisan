"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function CreateQuoteError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorState
      title="Could not load job site"
      message="Something went wrong while loading the job site for this quote. Please try again."
      onRetry={() => unstable_retry()}
    />
  );
}
