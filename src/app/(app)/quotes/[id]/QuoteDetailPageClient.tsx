"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  FileDown,
  Plus,
  RotateCcw,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { calculateQuoteTotal, formatCurrency } from "@/lib/quotes";

type LineItem = {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
};

type Quote = {
  id: string;
  quote_number: string;
  job_site_id: string;
  date: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  notes: string | null;
  created_at: string;
  updated_at: string;
  line_items: LineItem[];
  job_site: {
    id: string;
    title: string;
    address: string;
    client: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
    };
  };
};

type EditableLineItem = {
  localId: string;
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
};

type ConfirmAction = "send" | "accept" | "reject" | "revert" | null;

const statusConfig: Record<Quote["status"], { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-700 dark:text-zinc-300" },
  sent: { label: "Sent", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  accepted: { label: "Accepted", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
  rejected: { label: "Rejected", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
};

function StatusBadge({ status }: { status: Quote["status"] }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function makeEditableItems(items: LineItem[]): EditableLineItem[] {
  return items.map((item) => ({
    localId: item.id,
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    sort_order: item.sort_order,
  }));
}

function reindexItems(items: EditableLineItem[]) {
  return items.map((item, index) => ({ ...item, sort_order: index }));
}

function ReadOnlyLineItems({ items }: { items: LineItem[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 md:block">
        <table className="w-full">
          <thead className="bg-zinc-100 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Description</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900 dark:text-white">Qty</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-white">Unit Price</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-white">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-black">
            {items.map((item) => {
              const lineTotal = item.quantity * item.unit_price;
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-zinc-900 dark:text-white">{item.description}</td>
                  <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">{formatCurrency(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-white">{formatCurrency(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const lineTotal = item.quantity * item.unit_price;
          return (
            <div key={item.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
              <p className="mb-2 font-medium text-zinc-900 dark:text-white">{item.description}</p>
              <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                <span>
                  {item.quantity} × {formatCurrency(item.unit_price)}
                </span>
                <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(lineTotal)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function EditableLineItems({
  items,
  onUpdate,
  onDelete,
}: {
  items: EditableLineItem[];
  onUpdate: (localId: string, field: keyof Omit<EditableLineItem, "localId" | "id">, value: string | number) => void;
  onDelete: (item: EditableLineItem) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const lineTotal = item.quantity * item.unit_price;
        return (
          <div
            key={item.localId}
            className="flex flex-col items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50 sm:flex-row sm:items-end"
          >
            <div className="w-full flex-1 sm:w-auto">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Description</label>
              <input
                type="text"
                value={item.description}
                onChange={(event) => onUpdate(item.localId, "description", event.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                placeholder="e.g. Copper pipe 15mm"
              />
            </div>
            <div className="w-full sm:w-24">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Qty</label>
              <input
                type="number"
                min="0.01"
                step="1"
                value={item.quantity || ""}
                onChange={(event) => onUpdate(item.localId, "quantity", parseFloat(event.target.value) || 0)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div className="w-full sm:w-28">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Unit Price (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unit_price || ""}
                onChange={(event) => onUpdate(item.localId, "unit_price", parseFloat(event.target.value) || 0)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div className="w-full sm:w-28">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Line Total</label>
              <div className="px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-white">{formatCurrency(lineTotal)}</div>
            </div>
            <button
              onClick={() => onDelete(item)}
              className="self-end rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              aria-label="Remove line item"
            >
              <Trash2 size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function QuoteDetailPageClient({ initialQuote }: { initialQuote: Quote }) {
  const router = useRouter();
  const { success, error } = useToast();
  const quote = initialQuote;
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<EditableLineItem[]>(makeEditableItems(initialQuote.line_items));
  const [editNotes, setEditNotes] = useState(initialQuote.notes ?? "");
  const [dirtyItems, setDirtyItems] = useState<Set<string>>(new Set());
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isDraft = quote.status === "draft";
  const displayTotal = isEditing
    ? calculateQuoteTotal(editItems.map((item) => ({ quantity: item.quantity, unit_price: item.unit_price })))
    : calculateQuoteTotal(quote.line_items);

  const updateItem = (
    localId: string,
    field: keyof Omit<EditableLineItem, "localId" | "id">,
    value: string | number,
  ) => {
    setEditItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, [field]: value } : item)),
    );
    setDirtyItems((current) => new Set(current).add(localId));
  };

  const addLineItem = () => {
    const localId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setEditItems((current) => [
      ...current,
      {
        localId,
        description: "",
        quantity: 1,
        unit_price: 0,
        sort_order: current.length,
      },
    ]);
    setDirtyItems((current) => new Set(current).add(localId));
  };

  const removeLineItem = async (item: EditableLineItem) => {
    if (item.id) {
      try {
        const response = await fetch(`/api/quotes/${quote.id}/items/${item.id}`, { method: "DELETE" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to remove line item");
        }
      } catch (deleteError) {
        error(deleteError instanceof Error ? deleteError.message : "Failed to remove line item");
        return;
      }
    }

    setEditItems((current) => reindexItems(current.filter((currentItem) => currentItem.localId !== item.localId)));
    setDirtyItems((current) => {
      const next = new Set(current);
      next.delete(item.localId);
      return next;
    });
  };

  const handleSaveDraft = async () => {
    setEditError(null);

    if (editItems.some((item) => !item.description.trim() || item.quantity <= 0 || item.unit_price < 0)) {
      setEditError("All items need a description, a quantity above 0, and a price of 0 or more.");
      return;
    }

    setIsSaving(true);

    try {
      for (const item of editItems) {
        if (!dirtyItems.has(item.localId)) {
          continue;
        }

        const payload = {
          description: item.description.trim(),
          quantity: item.quantity,
          unit_price: item.unit_price,
          sort_order: item.sort_order,
        };

        if (item.id) {
          const response = await fetch(`/api/quotes/${quote.id}/items/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to update line item");
          }
        } else {
          const response = await fetch(`/api/quotes/${quote.id}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to create line item");
          }
        }
      }

      if (editNotes !== (quote.notes ?? "")) {
        const response = await fetch(`/api/quotes/${quote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: editNotes.trim() || null }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update quote notes");
        }
      }

      success("Quote updated");
      router.refresh();
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "Failed to save quote changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (nextStatus: "sent" | "accepted" | "rejected") => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update quote");
      }

      success(
        nextStatus === "sent"
          ? "Quote sent"
          : nextStatus === "accepted"
            ? "Quote marked as accepted"
            : "Quote marked as rejected",
      );
      router.refresh();
    } catch (statusError) {
      error(statusError instanceof Error ? statusError.message : "Failed to update quote");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleRevert = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert" }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to revert quote");
      }

      success("Quote reverted to draft");
      router.refresh();
    } catch (revertError) {
      error(revertError instanceof Error ? revertError.message : "Failed to revert quote");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const jobSite = quote.job_site;
  const client = jobSite?.client;
  const readOnlyItems = useMemo(() => quote.line_items, [quote.line_items]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 p-4 pb-0 md:p-8 md:pb-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">{quote.quote_number}</h1>
              <StatusBadge status={quote.status} />
            </div>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              {jobSite?.title} — {client?.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isDraft && !isEditing ? (
            <>
              <Button onClick={() => setIsEditing(true)}>Edit Quote</Button>
              <Button variant="secondary" leadingIcon={<Send size={16} />} onClick={() => setConfirmAction("send")}>
                Send Quote
              </Button>
            </>
          ) : null}

          {isDraft && isEditing ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditItems(makeEditableItems(quote.line_items));
                  setEditNotes(quote.notes ?? "");
                  setDirtyItems(new Set());
                  setEditError(null);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : null}

          {quote.status === "sent" ? (
            <>
              <Button variant="secondary" leadingIcon={<RotateCcw size={16} />} onClick={() => setConfirmAction("revert")} disabled={actionLoading}>
                Revert to Draft
              </Button>
              <Button leadingIcon={<ThumbsUp size={16} />} onClick={() => setConfirmAction("accept")} disabled={actionLoading}>
                Accepted
              </Button>
              <Button variant="danger" leadingIcon={<ThumbsDown size={16} />} onClick={() => setConfirmAction("reject")} disabled={actionLoading}>
                Rejected
              </Button>
            </>
          ) : null}
        </div>

        <div>
          <a
            href={`/api/quotes/${quote.id}/pdf`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
          >
            <FileDown size={16} />
            Download PDF
          </a>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-4 pt-0 md:p-8 md:pt-0">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Client</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{client?.name}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Job Site</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{jobSite?.title}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formatDate(quote.date)}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Address</p>
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{jobSite?.address}</p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Line Items</h2>
            {isDraft && isEditing ? (
              <Button size="sm" leadingIcon={<Plus size={16} />} onClick={addLineItem}>
                Add Item
              </Button>
            ) : null}
          </div>

          {editError ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle size={18} />
              <span>{editError}</span>
            </div>
          ) : null}

          {!isEditing && readOnlyItems.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-zinc-200 py-12 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No line items yet</p>
            </div>
          ) : isEditing ? (
            editItems.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-zinc-200 py-12 text-center dark:border-zinc-700">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No line items yet</p>
              </div>
            ) : (
              <EditableLineItems items={editItems} onUpdate={updateItem} onDelete={removeLineItem} />
            )
          ) : (
            <ReadOnlyLineItems items={readOnlyItems} />
          )}
        </div>

        {!isEditing && quote.notes ? (
          <div>
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">Notes</h2>
            <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {quote.notes}
            </p>
          </div>
        ) : null}

        {isEditing ? (
          <div>
            <label htmlFor="quote-notes" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes</label>
            <textarea
              id="quote-notes"
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="Terms, validity period, etc..."
            />
          </div>
        ) : null}

        <div className="rounded-lg border border-zinc-200 bg-white p-4 md:p-6 dark:border-zinc-800 dark:bg-black">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-zinc-900 dark:text-white">Total</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(displayTotal)}</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmAction === "send"}
        title="Send Quote?"
        message="This will mark the quote as sent. It becomes read-only until you revert it back to draft."
        confirmLabel="Send"
        confirmVariant="primary"
        onConfirm={() => handleStatusChange("sent")}
        onCancel={() => setConfirmAction(null)}
        isBusy={actionLoading}
      />
      <ConfirmDialog
        isOpen={confirmAction === "accept"}
        title="Mark as Accepted?"
        message="This confirms the client has accepted the quote."
        confirmLabel="Accept"
        confirmVariant="primary"
        onConfirm={() => handleStatusChange("accepted")}
        onCancel={() => setConfirmAction(null)}
        isBusy={actionLoading}
      />
      <ConfirmDialog
        isOpen={confirmAction === "reject"}
        title="Mark as Rejected?"
        message="This records that the client has declined the quote."
        confirmLabel="Reject"
        confirmVariant="danger"
        onConfirm={() => handleStatusChange("rejected")}
        onCancel={() => setConfirmAction(null)}
        isBusy={actionLoading}
      />
      <ConfirmDialog
        isOpen={confirmAction === "revert"}
        title="Revert to Draft?"
        message="This will allow you to edit the quote again."
        confirmLabel="Revert to Draft"
        confirmVariant="primary"
        onConfirm={handleRevert}
        onCancel={() => setConfirmAction(null)}
        isBusy={actionLoading}
      />
    </div>
  );
}
