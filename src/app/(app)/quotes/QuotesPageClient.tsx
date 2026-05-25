"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { calculateQuoteTotal, formatCurrency } from "@/lib/quotes";

type LineItem = {
  id: string;
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
  line_items: LineItem[];
  job_site: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    };
  };
};

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

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
      <input
        type="text"
        placeholder="Search quotes..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-zinc-300 bg-white py-3 pl-10 pr-4 text-zinc-900 placeholder-zinc-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
      />
    </div>
  );
}

function NoResultsState({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <Search className="mb-4 text-zinc-300 dark:text-zinc-600" size={48} />
      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">No quotes found</h3>
      <p className="text-center text-zinc-600 dark:text-zinc-400">
        {searchTerm ? `No quotes match “${searchTerm}”. Try a different search.` : "No quotes match your current filter."}
      </p>
    </div>
  );
}

function QuoteCard({ quote, onOpen, onDelete }: { quote: Quote; onOpen: () => void; onDelete: () => void }) {
  const total = calculateQuoteTotal(quote.line_items);

  return (
    <div className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
      <button
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="absolute right-3 top-3 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
        aria-label="Delete quote"
      >
        <Trash2 size={16} />
      </button>
      <div onClick={onOpen} className="cursor-pointer pr-10">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-semibold text-zinc-900 dark:text-white">{quote.quote_number}</span>
          <StatusBadge status={quote.status} />
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{quote.job_site?.title}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{quote.job_site?.client.name}</p>
        <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
          <span className="text-xs text-zinc-500">{formatDate(quote.date)}</span>
          <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

function QuoteTable({
  quotes,
  onOpen,
  onDelete,
}: {
  quotes: Quote[];
  onOpen: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 md:block">
      <table className="w-full">
        <thead className="bg-zinc-100 dark:bg-zinc-800">
          <tr>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-white">Quote #</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-white">Client</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-white">Job Site</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-white">Status</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-white">Date</th>
            <th className="px-2 py-2 text-right text-sm font-semibold text-zinc-900 dark:text-white">Total</th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-black">
          {quotes.map((quote) => {
            const total = calculateQuoteTotal(quote.line_items);

            return (
              <tr key={quote.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="cursor-pointer whitespace-nowrap px-3 py-2 font-semibold text-zinc-900 hover:text-blue-600 dark:text-white" onClick={() => onOpen(quote)}>
                  {quote.quote_number}
                </td>
                <td className="cursor-pointer px-3 py-2 text-zinc-600 hover:text-blue-600 dark:text-zinc-400" onClick={() => onOpen(quote)}>
                  {quote.job_site?.client.name}
                </td>
                <td className="cursor-pointer px-3 py-2 text-zinc-600 hover:text-blue-600 dark:text-zinc-400" onClick={() => onOpen(quote)}>
                  {quote.job_site?.title}
                </td>
                <td className="px-2 py-2"><StatusBadge status={quote.status} /></td>
                <td className="whitespace-nowrap px-2 py-2 text-zinc-600 dark:text-zinc-400">{formatDate(quote.date)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right font-medium text-zinc-900 dark:text-white">{formatCurrency(total)}</td>
                <td className="px-1 py-2 text-right">
                  <button
                    onClick={() => onDelete(quote)}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label="Delete quote"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function QuotesPageClient({ initialQuotes }: { initialQuotes: Quote[] }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      const matchesSearch =
        !searchQuery ||
        quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.job_site?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.job_site?.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, statusFilter]);

  const handleDelete = async () => {
    if (!deletingQuote) {
      return;
    }

    try {
      const response = await fetch(`/api/quotes/${deletingQuote.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete quote");
      }

      setQuotes((current) => current.filter((quote) => quote.id !== deletingQuote.id));
      success(`${deletingQuote.quote_number} deleted`);
    } catch (deleteError) {
      error(deleteError instanceof Error ? deleteError.message : "Failed to delete quote");
    } finally {
      setDeletingQuote(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 p-4 pb-0 md:p-8 md:pb-0">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">Quotes</h1>
        </div>

        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label htmlFor="quote-status-filter" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Status:</label>
            <select
              id="quote-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {quotes.length > 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredQuotes.length === quotes.length
                ? `Showing all ${quotes.length} quote${quotes.length !== 1 ? "s" : ""}`
                : `Found ${filteredQuotes.length} of ${quotes.length} quotes`}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 pt-0 md:p-8 md:pt-0">
        {quotes.length === 0 ? (
          <EmptyState
            icon={<FileText className="text-zinc-400" size={48} />}
            title="No quotes yet"
            description="Create your first quote from a job site to start tracking estimates and approvals."
          />
        ) : filteredQuotes.length === 0 ? (
          <NoResultsState searchTerm={searchQuery} />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onOpen={() => router.push(`/quotes/${quote.id}`)}
                  onDelete={() => setDeletingQuote(quote)}
                />
              ))}
            </div>
            <QuoteTable
              quotes={filteredQuotes}
              onOpen={(quote) => router.push(`/quotes/${quote.id}`)}
              onDelete={setDeletingQuote}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(deletingQuote)}
        title="Delete Quote?"
        message={`Are you sure you want to delete ${deletingQuote?.quote_number ? `“${deletingQuote.quote_number}”` : "this quote"}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingQuote(null)}
      />
    </div>
  );
}
