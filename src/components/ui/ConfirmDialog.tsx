"use client";

import { useEffect } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  isBusy = false,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  isBusy?: boolean;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-red-100 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {confirmVariant === "danger" ? <Trash2 size={30} /> : <AlertTriangle size={30} />}
          </div>
          <h2 id="confirm-dialog-title" className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
            {title}
          </h2>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
          <div className="flex w-full gap-3">
            <Button variant="secondary" fullWidth onClick={onCancel} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              variant={confirmVariant === "danger" ? "danger" : "primary"}
              fullWidth
              onClick={onConfirm}
              disabled={isBusy}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
