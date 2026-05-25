"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
        <AlertCircle className="mx-auto mb-3 text-red-600" size={40} />
        <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">{title}</h3>
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{message}</p>
        <Button variant="danger" onClick={onRetry}>Try Again</Button>
      </div>
    </div>
  );
}
