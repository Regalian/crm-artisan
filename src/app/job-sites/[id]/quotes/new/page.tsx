"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle, Loader2, X, CheckCircle, ArrowLeft, Plus, Trash2
} from "lucide-react";
import { ErrorToast } from "@/app/components/Toast";
import { calculateQuoteTotal, formatCurrency } from "@/lib/quotes";

// Types
interface JobSite {
  id: string;
  title: string;
  address: string;
  client: { id: string; name: string };
}

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

type LoadingState = "idle" | "loading" | "success" | "error";

// Loading State Component
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="text-blue-600 animate-spin mb-4" size={40} />
      <p className="text-zinc-600 dark:text-zinc-400">Loading job site details...</p>
    </div>
  );
}

// Error State Component
function ErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
        <AlertCircle className="text-red-600 mx-auto mb-3" size={40} />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Could not load job site</h3>
        <p className="text-red-600 dark:text-red-400 text-sm mb-4">Something went wrong. Please try again.</p>
        <button onClick={onRetry} className="bg-red-600 text-white rounded-md px-4 py-2 font-medium hover:bg-red-700 transition-colors">Try Again</button>
      </div>
    </div>
  );
}

// Line Item Row Component
function LineItemRow({
  item,
  index,
  isSaved,
  onUpdate,
  onDelete,
}: {
  item: LineItem;
  index: number;
  isSaved: boolean;
  onUpdate: (index: number, field: keyof LineItem, value: string | number) => void;
  onDelete: (index: number) => void;
}) {
  const lineTotal = item.quantity * item.unit_price;

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
      {/* Description */}
      <div className="flex-1 min-w-0 w-full sm:w-auto">
        <label htmlFor={`description-${index}`} className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          Description
        </label>
        <input
          id={`description-${index}`}
          type="text"
          value={item.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="e.g. Copper pipe 15mm"
        />
      </div>

      {/* Quantity */}
      <div className="w-full sm:w-24">
        <label htmlFor={`qty-${index}`} className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          Qty
        </label>
        <input
          id={`qty-${index}`}
          type="number"
          min="0.01"
          step="1"
          value={item.quantity ?? ""}
          onChange={(e) => onUpdate(index, "quantity", parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Unit Price */}
      <div className="w-full sm:w-28">
        <label htmlFor={`unit-price-${index}`} className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          Unit Price (£)
        </label>
        <input
          id={`unit-price-${index}`}
          type="number"
          min="0"
          step="0.01"
          value={item.unit_price ?? ""}
          onChange={(e) => onUpdate(index, "unit_price", parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Line Total */}
      <div className="w-full sm:w-24">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          Line Total
        </label>
        <div className="px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-white">
          {formatCurrency(lineTotal)}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(index)}
        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors self-end"
        aria-label="Remove line item"
      >
        <Trash2 size={18} />
      </button>

      {/* Saved indicator */}
      {isSaved && (
        <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <CheckCircle size={12} /> Saved
        </div>
      )}
    </div>
  );
}

export default function CreateQuotePage() {
  const params = useParams();
  const router = useRouter();
  const jobSiteId = params.id as string;

  const [jobSite, setJobSite] = useState<JobSite | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingItems, setSavingItems] = useState<Set<number>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setServerErrors] = useState<{ general?: string }>({});

  // Fetch job site details
  const fetchJobSite = useCallback(async () => {
    setLoadingState("loading");
    setServerError(null);

    try {
      const response = await fetch(`/api/job-sites/${jobSiteId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job site");
      }
      const data = await response.json();
      setJobSite(data.job_site);
      setLoadingState("success");
    } catch (err) {
      setServerError("Could not load job site. Please check your connection and try again.");
      setLoadingState("error");
    }
  }, [jobSiteId]);

  useEffect(() => {
    fetchJobSite();
  }, [fetchJobSite]);

  // Calculate live total
  const total = calculateQuoteTotal(lineItems);

  // Add a new blank line item
  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: "",
        quantity: 1,
        unit_price: 0,
        sort_order: prev.length,
      },
    ]);
  };

  // Update a line item field
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
    // Clear "saved" status when editing
    setSavingItems((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  // Delete a line item
  const deleteLineItem = async (index: number) => {
    const item = lineItems[index];

    // If the item has been saved to the DB, delete it there too
    if (item.id && quoteId) {
      try {
        await fetch(`/api/quotes/${quoteId}/items/${item.id}`, { method: "DELETE" });
      } catch {
        // Non-critical — optimistically remove from state
      }
    }

    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Save a single line item (requires quoteId to already exist)
  const saveLineItem = async (index: number, currentQuoteId: string): Promise<boolean> => {
    const item = lineItems[index];

    if (!item.description.trim()) return false;
    if (!item.quantity || item.quantity <= 0) return false;
    if (item.unit_price < 0) return false;

    // Save the line item
    try {
      const response = await fetch(`/api/quotes/${currentQuoteId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: item.description.trim(),
          quantity: item.quantity,
          unit_price: item.unit_price,
          sort_order: item.sort_order,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save line item");
      }
      const data = await response.json();

      // Mark this item as saved and store its ID
      setLineItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, id: data.item.id } : it))
      );
      setSavingItems((prev) => new Set([...prev, index]));
      return true;
    } catch {
      setServerErrors({ general: "Failed to save line item. Please try again." });
      return false;
    }
  };

  // Save all unsaved line items
  const saveAllItems = async (): Promise<string | null> => {
    // Create the quote first if it doesn't exist yet
    let currentQuoteId = quoteId;
    if (!currentQuoteId) {
      try {
        const response = await fetch(`/api/job-sites/${jobSiteId}/quotes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "draft",
            line_items: [],
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to create quote");
        }
        const data = await response.json();
        currentQuoteId = data.quote.id;
        setQuoteId(currentQuoteId);
      } catch {
        setServerErrors({ general: "Failed to create quote. Please try again." });
        return null;
      }
    }

    // currentQuoteId is guaranteed to be a string at this point
    if (!currentQuoteId) return null;

    // Now save all line items to the same quote
    for (let i = 0; i < lineItems.length; i++) {
      if (!savingItems.has(i)) {
        const ok = await saveLineItem(i, currentQuoteId);
        if (!ok) return null;
      }
    }
    return currentQuoteId;
  };

  // Save draft (save all items, then update notes)
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setServerErrors({});

    const savedQuoteId = await saveAllItems();
    if (!savedQuoteId) {
      setIsSaving(false);
      return;
    }

    // Update the quote with notes if we have any
    if (notes.trim()) {
      try {
        await fetch(`/api/quotes/${savedQuoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notes.trim() }),
        });
      } catch {
        // Non-critical
      }
    }

    setSuccessMessage("Quote saved as draft");
    // Navigate to the quote detail page
    router.push(`/quotes/${savedQuoteId}`);
  };

  // Render content based on state
  if (loadingState === "loading" || loadingState === "idle") {
    return <LoadingState />;
  }

  if (loadingState === "error") {
    return <ErrorState onRetry={fetchJobSite} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="p-4 md:p-8 pb-0 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
              New Quote
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {jobSite?.title} — {jobSite?.client.name}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8 pt-0 space-y-6">
        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Line Items
            </h2>
            <button
              onClick={addLineItem}
              className="bg-blue-600 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              <AlertCircle size={18} />
              <span>{errors.general}</span>
            </div>
          )}

          {lineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
              <Plus className="text-zinc-400 mb-2" size={32} />
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Tap &ldquo;Add Item&rdquo; to start building your quote
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <LineItemRow
                  key={index}
                  item={item}
                  index={index}
                  isSaved={savingItems.has(index)}
                  onUpdate={updateLineItem}
                  onDelete={deleteLineItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {lineItems.length > 0 && (
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
              placeholder="Terms, validity period, etc..."
            />
          </div>
        )}

        {/* Total + Actions */}
        {lineItems.length > 0 && (
          <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                Total
              </span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(total)}
              </span>
            </div>
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save as Draft"
              )}
            </button>
          </div>
        )}
      </div>

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
