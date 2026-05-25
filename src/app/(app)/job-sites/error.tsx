"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function JobSitesError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorState
      title="Could not load job sites"
      message="Something went wrong while loading your job sites. Please try again."
      onRetry={() => unstable_retry()}
    />
  );
}
