"use client";

import {
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

type ToastType = "success" | "error";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (input: { type: ToastType; message: string }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, { container: string; icon: ReactNode }> = {
  success: {
    container: "border-green-200 bg-green-600 text-white dark:border-green-500/50",
    icon: <CheckCircle2 size={20} className="shrink-0" />,
  },
  error: {
    container: "border-red-200 bg-red-600 text-white dark:border-red-500/50",
    icon: <AlertCircle size={20} className="shrink-0" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input: { type: ToastType; message: string }) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setToasts((current) => [...current, { id, ...input }]);

    window.setTimeout(() => {
      dismiss(id);
    }, 3500);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    success: (message) => showToast({ type: "success", message }),
    error: (message) => showToast({ type: "error", message }),
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:inset-x-auto md:right-6 md:bottom-6 md:items-end md:px-0 md:pb-0"
      >
        {toasts.map((toast) => {
          const style = toastStyles[toast.type];

          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-4 shadow-xl md:max-w-md",
                style.container,
              )}
              role="status"
              aria-live="polite"
            >
              {style.icon}
              <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
