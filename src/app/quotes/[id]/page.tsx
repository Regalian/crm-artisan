"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle, Loader2, X, CheckCircle, ArrowLeft, Plus, Trash2, Send, RotateCcw, ThumbsUp, ThumbsDown, FileDown
} from "lucide-react";
import { calculateQuoteTotal, formatCurrency } from "@/lib/quotes";
import { ErrorToast } from "@/app/components/Toast";

// Types
interface LineItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

interface Quote {
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
}

type LoadingState = "idle" | "loading" | "success" | "error";

interface NewLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

// Status badge
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-700 dark:text-zinc-300" },
  sent: { label: "Sent", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  accepted: { label: "Accepted", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
  rejected: { label: "Rejected", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Loading State
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="text-blue-600 animate-spin mb-4" size={40} />
      <p className="text-zinc-600 dark:text-zinc-400">Loading quote...</p>
    </div>
  );
}

// Error State
function ErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
        <AlertCircle className="text-red-600 mx-auto mb-3" size={40} />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Could not load quote</h3>
        <p className="text-red-600 dark:text-red-400 text-sm mb-4">Something went wrong. Please try again.</p>
        <button onClick={onRetry} className="bg-red-600 text-white rounded-md px-4 py-2 font-medium hover:bg-red-700 transition-colors">Try Again</button>
      </div>
    </div>
  );
}

// Confirmation Modal
function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-sm mx-auto p-6">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">{title}</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">{message}</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors ${
                confirmVariant === "danger"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Line Item Row for read-only view
function LineItemRowView({ item, index }: { item: LineItem | NewLineItem; index: number }) {
  const lineTotal = item.quantity * item.unit_price;
  return (
    <tr className="border-b border-zinc-200 dark:border-zinc-800">
      <td className="px-4 py-3 text-zinc-900 dark:text-white">{item.description}</td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-center">{item.quantity}</td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-right">{formatCurrency(item.unit_price)}</td>
      <td className="px-4 py-3 text-zinc-900 dark:text-white font-medium text-right">{formatCurrency(lineTotal)}</td>
    </tr>
  );
}

// Editable Line Item Row
function LineItemRowEdit({
  item,
  index,
  isSaved,
  onUpdate,
  onDelete,
}: {
  item: LineItem | NewLineItem;
  index: number;
  isSaved: boolean;
  onUpdate: (index: number, field: string, value: string | number) => void;
  onDelete: (index: number) => void;
}) {
  const lineTotal = item.quantity * item.unit_price;
  const isNew = !("id" in item);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div className="flex-1 min-w-0 w-full sm:w-auto">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Description</label>
        <input
          type="text"
          value={item.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="e.g. Copper pipe 15mm"
        />
      </div>
      <div className="w-full sm:w-24">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Qty</label>
        <input
          type="number"
          min="0.01"
          step="1"
          value={item.quantity || ""}
          onChange={(e) => onUpdate(index, "quantity", parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>
      <div className="w-full sm:w-28">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Unit Price (£)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.unit_price || ""}
          onChange={(e) => onUpdate(index, "unit_price", parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>
      <div className="w-full sm:w-24">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Line Total</label>
        <div className="px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-white">{formatCurrency(lineTotal)}</div>
      </div>
      <button
        onClick={() => onDelete(index)}
        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors self-end"
        aria-label="Remove line item"
      >
        <Trash2 size={18} />
      </button>
      {isSaved && (
        <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <CheckCircle size={12} /> Saved
        </div>
      )}
    </div>
  );
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  // Edit state for draft quotes
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<(LineItem | NewLineItem)[]>([]);
  const [savedItemIndices, setSavedItemIndices] = useState<Set<number>>(new Set());
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Confirmation modals
  type ModalType = "revert" | "accept" | "reject" | "send" | null;
  const [confirmModal, setConfirmModal] = useState<ModalType>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Success toast
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch quote
  const fetchQuote = useCallback(async () => {
    setLoadingState("loading");
    setServerError(null);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (!response.ok) throw new Error("Failed to fetch quote");
      const data = await response.json();
      setQuote(data.quote);
      setEditNotes(data.quote.notes || "");
      setEditItems(data.quote.line_items || []);
      setSavedItemIndices(new Set((data.quote.line_items || []).map((_: unknown, i: number) => i)));
      setLoadingState("success");
    } catch (err) {
      setServerError("Could not load quote. Please check your connection and try again.");
      setLoadingState("error");
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const isDraft = quote?.status === "draft";
  const total = calculateQuoteTotal(editItems);
  const quoteTotal = calculateQuoteTotal(quote?.line_items || []);

  // --- Edit mode handlers ---

  const addLineItem = () => {
    setEditItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, sort_order: prev.length }]);
  };

  const updateEditItem = (index: number, field: string, value: string | number) => {
    setEditItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    setSavedItemIndices((prev) => { const n = new Set(prev); n.delete(index); return n; });
  };

  const deleteEditItem = async (index: number) => {
    const item = editItems[index];
    if ("id" in item && item.id) {
      try { await fetch(`/api/quotes/${quoteId}/items/${item.id}`, { method: "DELETE" }); } catch {}
    }
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const saveEditItems = async (): Promise<boolean> => {
    for (let i = 0; i < editItems.length; i++) {
      if (!savedItemIndices.has(i)) {
        const item = editItems[i];
        if (!item.description.trim() || !item.quantity || item.quantity <= 0) {
          setEditError("All items must have a description and quantity > 0");
          return false;
        }
        try {
          const response = await fetch(`/api/quotes/${quoteId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: item.description.trim(),
              quantity: item.quantity,
              unit_price: item.unit_price,
              sort_order: item.sort_order,
            }),
          });
          if (!response.ok) throw new Error("Failed to save item");
          const data = await response.json();
          setEditItems((prev) => prev.map((it, j) => (j === i ? { ...it, id: data.item.id } : it)));
          setSavedItemIndices((prev) => new Set([...prev, i]));
        } catch {
          setEditError("Failed to save line item");
          return false;
        }
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setEditError(null);
    const ok = await saveEditItems();
    if (!ok) { setIsSaving(false); return; }
    if (editNotes !== quote?.notes) {
      try {
        await fetch(`/api/quotes/${quoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: editNotes.trim() || null }),
        });
      } catch {}
    }
    fetchQuote();
    setIsEditing(false);
    setSuccessMessage("Quote updated");
    setIsSaving(false);
  };

  // --- Status change handlers ---

  const handleSend = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (!response.ok) throw new Error("Failed to send quote");
      setSuccessMessage("Quote sent");
      fetchQuote();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to send quote");
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  const handleRevert = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert" }),
      });
      if (!response.ok) throw new Error("Failed to revert quote");
      setSuccessMessage("Quote reverted to draft");
      fetchQuote();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to revert quote");
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });
      if (!response.ok) throw new Error("Failed to accept quote");
      setSuccessMessage("Quote marked as accepted");
      fetchQuote();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to update quote");
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!response.ok) throw new Error("Failed to reject quote");
      setSuccessMessage("Quote marked as rejected");
      fetchQuote();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to update quote");
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  // --- Render ---

  if (loadingState === "loading" || loadingState === "idle") return <LoadingState />;
  if (loadingState === "error") return <ErrorState onRetry={fetchQuote} />;
  if (!quote) return <ErrorState onRetry={fetchQuote} />;

  const displayItems = isEditing ? editItems : quote.line_items;
  const displayTotal = isEditing ? total : quoteTotal;
  const jobSite = quote.job_site;
  const client = jobSite?.client;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-8 pb-0 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
                {quote.quote_number}
              </h1>
              <StatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
              {jobSite?.title} — {client?.name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {isDraft && !isEditing && (
            <>
              <button
                onClick={() => { setIsEditing(true); setEditError(null); }}
                className="bg-blue-600 text-white rounded-md px-4 py-2 font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Edit Quote
              </button>
              <button
                onClick={() => setConfirmModal("send")}
                className="bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-md px-4 py-2 font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors flex items-center gap-2"
              >
                <Send size={16} />
                Send Quote
              </button>
            </>
          )}
          {isDraft && isEditing && (
            <>
              <button
                onClick={() => { setIsEditing(false); fetchQuote(); }}
                className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md px-4 py-2 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="bg-blue-600 text-white rounded-md px-4 py-2 font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </>
          )}
          {quote.status === "sent" && (
            <>
              <button
                onClick={() => setConfirmModal("revert")}
                disabled={actionLoading}
                className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md px-4 py-2 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RotateCcw size={16} />
                Revert to Draft
              </button>
              <button
                onClick={() => setConfirmModal("accept")}
                disabled={actionLoading}
                className="bg-green-600 text-white rounded-md px-4 py-2 font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ThumbsUp size={16} />
                Accepted
              </button>
              <button
                onClick={() => setConfirmModal("reject")}
                disabled={actionLoading}
                className="bg-red-600 text-white rounded-md px-4 py-2 font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ThumbsDown size={16} />
                Rejected
              </button>
            </>
          )}
        </div>

        {/* Download PDF - available for all quotes */}
        <div>
          <a
            href={`/api/quotes/${quoteId}/pdf`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <FileDown size={16} />
            Download PDF
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8 pt-0 space-y-6">
        {/* Quote Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Client</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{client?.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Job Site</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{jobSite?.title}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Date</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formatDate(quote.date)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Address</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{jobSite?.address}</p>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Line Items</h2>
            {isDraft && isEditing && (
              <button
                onClick={addLineItem}
                className="bg-blue-600 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <Plus size={16} />
                Add Item
              </button>
            )}
          </div>

          {editError && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              <AlertCircle size={18} />
              <span>{editError}</span>
            </div>
          )}

          {displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">No line items yet</p>
            </div>
          ) : isEditing ? (
            <div className="space-y-3">
              {displayItems.map((item, index) => (
                <LineItemRowEdit
                  key={index}
                  item={item}
                  index={index}
                  isSaved={savedItemIndices.has(index)}
                  onUpdate={updateEditItem}
                  onDelete={deleteEditItem}
                />
              ))}
            </div>
          ) : (
            <div className="hidden md:block overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full">
                <thead className="bg-zinc-100 dark:bg-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Description</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900 dark:text-white">Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-white">Unit Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-white">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-black divide-y divide-zinc-200 dark:divide-zinc-800">
                  {displayItems.map((item, idx) => (
                    <LineItemRowView key={"id" in item ? item.id : `new-${idx}`} item={item} index={idx} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile cards for read-only */}
          {!isEditing && displayItems.length > 0 && (
            <div className="md:hidden space-y-3">
              {displayItems.map((item, idx) => {
                const lineTotal = item.quantity * item.unit_price;
                return (
                  <div key={"id" in item ? item.id : `new-${idx}`} className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <p className="font-medium text-zinc-900 dark:text-white mb-2">{item.description}</p>
                    <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                      <span>{item.quantity} × {formatCurrency(item.unit_price)}</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(lineTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notes */}
        {quote.notes && !isEditing && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Notes</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
              {quote.notes}
            </p>
          </div>
        )}
        {isEditing && (
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes</label>
            <textarea
              id="notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
              placeholder="Terms, validity period, etc..."
            />
          </div>
        )}

        {/* Total */}
        <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 md:p-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-zinc-900 dark:text-white">Total</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(displayTotal)}</span>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {confirmModal === "revert" && (
        <ConfirmModal
          title="Revert to Draft?"
          message="This will allow you to edit the quote again. The client will see it as withdrawn."
          confirmLabel="Revert to Draft"
          confirmVariant="primary"
          onConfirm={handleRevert}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {confirmModal === "accept" && (
        <ConfirmModal
          title="Mark as Accepted?"
          message="This confirms the client has accepted this quote. You can proceed with the work."
          confirmLabel="Accept"
          confirmVariant="primary"
          onConfirm={handleAccept}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {confirmModal === "reject" && (
        <ConfirmModal
          title="Mark as Rejected?"
          message="This records that the client has declined this quote."
          confirmLabel="Reject"
          confirmVariant="danger"
          onConfirm={handleReject}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {confirmModal === "send" && (
        <ConfirmModal
          title="Send Quote?"
          message="This will mark the quote as sent. It will become read-only until reverted."
          confirmLabel="Send"
          confirmVariant="primary"
          onConfirm={handleSend}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Error Toast */}
      {serverError && <ErrorToast message={serverError} onClose={() => setServerError(null)} />}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-2 p-1 hover:bg-green-500 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
