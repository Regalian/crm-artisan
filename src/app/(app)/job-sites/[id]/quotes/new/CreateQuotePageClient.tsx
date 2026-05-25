"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { calculateQuoteTotal, formatCurrency } from "@/lib/quotes";

type JobSite = {
  id: string;
  title: string;
  address: string;
  client: {
    id: string;
    name: string;
  };
};

type LineItem = {
  localId: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
};

function reindexItems(items: LineItem[]) {
  return items.map((item, index) => ({ ...item, sort_order: index }));
}

function LineItemRow({
  item,
  index,
  onUpdate,
  onDelete,
}: {
  item: LineItem;
  index: number;
  onUpdate: (index: number, field: keyof Omit<LineItem, "localId">, value: string | number) => void;
  onDelete: (index: number) => void;
}) {
  const lineTotal = item.quantity * item.unit_price;

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50 sm:flex-row sm:items-end">
      <div className="w-full flex-1 sm:w-auto">
        <label htmlFor={`description-${index}`} className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Description
        </label>
        <input
          id={`description-${index}`}
          type="text"
          value={item.description}
          onChange={(event) => onUpdate(index, "description", event.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          placeholder="e.g. Copper pipe 15mm"
        />
      </div>
      <div className="w-full sm:w-24">
        <label htmlFor={`qty-${index}`} className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Qty</label>
        <input
          id={`qty-${index}`}
          type="number"
          min="0.01"
          step="1"
          value={item.quantity || ""}
          onChange={(event) => onUpdate(index, "quantity", parseFloat(event.target.value) || 0)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />
      </div>
      <div className="w-full sm:w-28">
        <label htmlFor={`unit-price-${index}`} className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Unit Price (£)</label>
        <input
          id={`unit-price-${index}`}
          type="number"
          min="0"
          step="0.01"
          value={item.unit_price || ""}
          onChange={(event) => onUpdate(index, "unit_price", parseFloat(event.target.value) || 0)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />
      </div>
      <div className="w-full sm:w-28">
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Line Total</label>
        <div className="px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-white">{formatCurrency(lineTotal)}</div>
      </div>
      <button
        onClick={() => onDelete(index)}
        className="self-end rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
        aria-label="Remove line item"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

export default function CreateQuotePageClient({ initialJobSite }: { initialJobSite: JobSite }) {
  const router = useRouter();
  const { error } = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const total = useMemo(
    () => calculateQuoteTotal(lineItems.map((item) => ({ quantity: item.quantity, unit_price: item.unit_price }))),
    [lineItems],
  );

  const addLineItem = () => {
    setLineItems((current) => [
      ...current,
      {
        localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: "",
        quantity: 1,
        unit_price: 0,
        sort_order: current.length,
      },
    ]);
  };

  const updateLineItem = (
    index: number,
    field: keyof Omit<LineItem, "localId">,
    value: string | number,
  ) => {
    setLineItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const deleteLineItem = (index: number) => {
    setLineItems((current) => reindexItems(current.filter((_, itemIndex) => itemIndex !== index)));
  };

  const handleSaveDraft = async () => {
    setGeneralError(null);

    if (lineItems.length === 0) {
      setGeneralError("Add at least one line item before saving the quote.");
      return;
    }

    if (lineItems.some((item) => !item.description.trim() || item.quantity <= 0 || item.unit_price < 0)) {
      setGeneralError("Each line item needs a description, a quantity above 0, and a price of 0 or more.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/job-sites/${initialJobSite.id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "draft",
          notes: notes.trim() || null,
          line_items: lineItems.map((item, index) => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unit_price: item.unit_price,
            sort_order: index,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create quote");
      }

      router.push(`/quotes/${data.quote.id}`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to create quote";
      setGeneralError(message);
      error(message);
    } finally {
      setIsSaving(false);
    }
  };

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
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">New Quote</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {initialJobSite.title} — {initialJobSite.client.name}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-4 pt-0 md:p-8 md:pt-0">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Line Items</h2>
            <Button size="sm" leadingIcon={<Plus size={16} />} onClick={addLineItem}>
              Add Item
            </Button>
          </div>

          {generalError ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle size={18} />
              <span>{generalError}</span>
            </div>
          ) : null}

          {lineItems.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-zinc-200 py-12 text-center dark:border-zinc-700">
              <Plus className="mx-auto mb-2 text-zinc-400" size={32} />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Tap “Add Item” to start building your quote</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <LineItemRow
                  key={item.localId}
                  item={item}
                  index={index}
                  onUpdate={updateLineItem}
                  onDelete={deleteLineItem}
                />
              ))}
            </div>
          )}
        </div>

        {lineItems.length > 0 ? (
          <div>
            <label htmlFor="quote-notes" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes</label>
            <textarea
              id="quote-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="Terms, validity period, etc..."
            />
          </div>
        ) : null}

        {lineItems.length > 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 md:p-6 dark:border-zinc-800 dark:bg-black">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-semibold text-zinc-900 dark:text-white">Total</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(total)}</span>
            </div>
            <Button fullWidth size="lg" onClick={handleSaveDraft} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save as Draft"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
