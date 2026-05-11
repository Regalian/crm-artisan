import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

export function ErrorToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 bg-red-600 text-white rounded-lg shadow-lg max-w-sm">
      <AlertCircle size={20} className="shrink-0 mt-0.5" />
      <span className="font-medium text-sm">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-1 hover:bg-red-500 rounded transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * Generic toast hook for consistent error/success notifications.
 */
export function useToast() {
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const success = (message: string) => setToast({ type: "success", message });
  const error = (message: string) => setToast({ type: "error", message });
  const dismiss = () => setToast(null);

  return { toast, success, error, dismiss };
}
