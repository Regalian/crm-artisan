import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="mb-4 animate-spin text-blue-600" size={40} />
      <p className="text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );
}
