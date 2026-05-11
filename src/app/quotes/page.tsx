"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertCircle, Loader2, Plus, X, CheckCircle, Trash2 } from "lucide-react";
import { ErrorToast } from "@/app/components/Toast";
import { calculateQuoteTotal, formatCurrency } from "@/lib/quotes";

// Types
interface LineItem {
  id: string;
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
  line_items: LineItem[];
  job_site: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    };
  };
}

type LoadingState = "idle" | "loading" | "success" | "error";

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

// Search Bar
function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
      <input
        type="text"
        placeholder="Search quotes..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
    </div>
  );
}

// Loading State
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="text-blue-600 animate-spin mb-4" size={40} />
      <p className="text-zinc-600 dark:text-zinc-400">Loading your quotes...</p>
    </div>
  );
}

// Error State
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
        <AlertCircle className="text-red-600 mx-auto mb-3" size={40} />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Could not load quotes</h3>
        <p className="text-red-600 dark:text-red-400 text-sm mb-4">Something went wrong. Please try again.</p>
        <button onClick={onRetry} className="bg-red-600 text-white rounded-md px-4 py-2 font-medium hover:bg-red-700 transition-colors">
          Try Again
        </button>
      </div>
    </div>
  );
}

// No Results State
function NoResultsState({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Search className="text-zinc-300 dark:text-zinc-600 mb-4" size={48} />
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No quotes found</h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-center">
        No quotes match &ldquo;{searchTerm}&rdquo;. Try a different search.
      </p>
    </div>
  );
}

// Empty State
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full p-6 mb-4">
        <Plus className="text-zinc-400" size={48} />
      </div>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No quotes yet</h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-sm mb-6">
        Create your first quote from a job site to start tracking estimates.
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        Go to a job site and tap &ldquo;Create Quote&rdquo; to get started.
      </p>
    </div>
  );
}

// Quote Card (mobile)
function QuoteCard({
  quote,
  onClick,
  onDelete,
}: {
  quote: Quote;
  onClick: () => void;
  onDelete: () => void;
}) {
  const total = calculateQuoteTotal(quote.line_items);
  return (
    <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-3 relative">
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-3 right-3 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all z-10"
        aria-label="Delete quote"
      >
        <Trash2 size={16} />
      </button>
      <div onClick={onClick} className="pr-10 cursor-pointer">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-zinc-900 dark:text-white">{quote.quote_number}</span>
          <StatusBadge status={quote.status} />
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{quote.job_site?.title}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{quote.job_site?.client.name}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-500">{formatDate(quote.date)}</span>
          <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

// Quote Row (desktop)
function QuoteRow({
  quote,
  onClick,
  onDelete,
}: {
  quote: Quote;
  onClick: () => void;
  onDelete: () => void;
}) {
  const total = calculateQuoteTotal(quote.line_items);
  return (
    <tr className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white cursor-pointer hover:text-blue-600" onClick={onClick}>
        {quote.quote_number}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-blue-600" onClick={onClick}>
        {quote.job_site?.client.name}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-blue-600" onClick={onClick}>
        {quote.job_site?.title}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={quote.status} />
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
        {formatDate(quote.date)}
      </td>
      <td className="px-4 py-3 text-zinc-900 dark:text-white font-medium text-right">
        {formatCurrency(total)}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="Delete quote"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch quotes
  const fetchQuotes = useCallback(async () => {
    setLoadingState("loading");
    setServerError(null);
    try {
      const response = await fetch("/api/quotes");
      if (!response.ok) throw new Error("Failed to fetch quotes");
      const data = await response.json();
      setQuotes(data.quotes || []);
      setLoadingState("success");
    } catch (err) {
      setServerError("Could not load quotes. Please check your connection and try again.");
      setLoadingState("error");
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Filter
  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      !searchQuery ||
      q.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.job_site?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.job_site?.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Delete
  const handleDelete = async () => {
    if (!deletingQuote) return;
    try {
      const response = await fetch(`/api/quotes/${deletingQuote.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete quote");
      setQuotes((prev) => prev.filter((q) => q.id !== deletingQuote.id));
      setSuccessMessage(`${deletingQuote.quote_number} deleted`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to delete quote");
    } finally {
      setDeletingQuote(null);
    }
  };

  // Render content
  const renderContent = () => {
    if (loadingState === "loading" || loadingState === "idle") return <LoadingState />;
    if (loadingState === "error") return <ErrorState onRetry={fetchQuotes} />;
    if (quotes.length === 0) return <EmptyState onCreate={() => {}} />;
    if (filteredQuotes.length === 0 && (searchQuery || statusFilter !== "all"))
      return <NoResultsState searchTerm={searchQuery} />;

    return (
      <>
        <div className="md:hidden space-y-3">
          {filteredQuotes.map((q) => (
            <QuoteCard
              key={q.id}
              quote={q}
              onClick={() => router.push(`/quotes/${q.id}`)}
              onDelete={() => setDeletingQuote(q)}
            />
          ))}
        </div>
        <div className="hidden md:block overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Quote #</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Client</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Job Site</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Date</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-white">Total</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredQuotes.map((q) => (
                <QuoteRow
                  key={q.id}
                  quote={q}
                  onClick={() => router.push(`/quotes/${q.id}`)}
                  onDelete={() => setDeletingQuote(q)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="p-4 md:p-8 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">Quotes</h1>
        </div>

        {/* Search Bar */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Filters Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label htmlFor="status-filter" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {loadingState === "success" && quotes.length > 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredQuotes.length === quotes.length
                ? `Showing all ${quotes.length} quote${quotes.length !== 1 ? "s" : ""}`
                : `Found ${filteredQuotes.length} of ${quotes.length} quotes`}
            </p>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-8 pt-0">
        {renderContent()}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeletingQuote(null)}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-sm mx-auto p-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
                <Trash2 className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Delete Quote?</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Are you sure you want to delete <strong>{deletingQuote.quote_number}</strong>? This cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeletingQuote(null)}
                  className="flex-1 px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
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
