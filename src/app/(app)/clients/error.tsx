"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function ClientsError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorState
      title="Could not load clients"
      message="Something went wrong while loading your client list. Please try again."
      onRetry={() => unstable_retry()}
    />
  );
}
