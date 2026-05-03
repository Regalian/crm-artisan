"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Phone, Mail, MapPin, AlertCircle, Loader2, UserPlus } from "lucide-react";

// Type definitions - matches Supabase schema
interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type LoadingState = "idle" | "loading" | "success" | "error";

// SearchBar Component
function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        size={20}
      />
      <input
        type="text"
        placeholder="Search clients by name..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
    </div>
  );
}

// Loading State Component
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="text-blue-600 animate-spin mb-4" size={40} />
      <p className="text-zinc-600 dark:text-zinc-400">Loading your clients...</p>
    </div>
  );
}

// Error State Component
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
        <AlertCircle className="text-red-600 mx-auto mb-3" size={40} />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Something went wrong
        </h3>
        <p className="text-red-600 dark:text-red-400 text-sm mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="bg-red-600 text-white rounded-md px-4 py-2 font-medium hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full p-6 mb-4">
        <UserPlus className="text-zinc-400" size={48} />
      </div>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
        No clients yet
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-sm mb-6">
        Welcome! Start by adding your first client. You can store their contact
        information and link job sites later.
      </p>
      <button className="bg-blue-600 text-white rounded-md px-6 py-3 font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
        <UserPlus size={20} />
        Add Your First Client
      </button>
    </div>
  );
}

// No Results State Component
function NoResultsState({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Search className="text-zinc-300 dark:text-zinc-600 mb-4" size={48} />
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
        No clients found
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-center">
        No clients match &ldquo;{searchTerm}&rdquo;. Try a different name.
      </p>
    </div>
  );
}

// Client Card Component (for mobile)
function ClientCard({ client }: { client: Client }) {
  return (
    <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-3">
      <h3 className="font-semibold text-zinc-900 dark:text-white text-lg mb-2">
        {client.name}
      </h3>
      <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <a
          href={`tel:${client.phone}`}
          className="flex items-center gap-2 hover:text-blue-600 transition-colors"
        >
          <Phone size={16} />
          <span>{client.phone}</span>
        </a>
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
          >
            <Mail size={16} />
            <span>{client.email}</span>
          </a>
        )}
        {client.address && (
          <div className="flex items-start gap-2 text-zinc-500">
            <MapPin size={16} className="shrink-0 mt-0.5" />
            <span>{client.address}</span>
          </div>
        )}
      </div>
      {client.notes && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500 italic border-t border-zinc-100 dark:border-zinc-800 pt-2">
          {client.notes}
        </p>
      )}
    </div>
  );
}

// Client Row Component (for desktop table)
function ClientRow({ client }: { client: Client }) {
  return (
    <tr className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
        {client.name}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
        <a
          href={`tel:${client.phone}`}
          className="flex items-center gap-2 hover:text-blue-600 transition-colors"
        >
          <Phone size={16} />
          <span>{client.phone}</span>
        </a>
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
        {client.email ? (
          <a
            href={`mailto:${client.email}`}
            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
          >
            <Mail size={16} />
            <span>{client.email}</span>
          </a>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
        {client.address ? (
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span className="max-w-xs truncate" title={client.address}>
              {client.address}
            </span>
          </div>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
        {client.notes ? (
          <span className="max-w-xs truncate block" title={client.notes}>
            {client.notes}
          </span>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
    </tr>
  );
}

// Client Table Component (for desktop)
function ClientTable({ clients }: { clients: Client[] }) {
  return (
    <div className="hidden md:block overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full">
        <thead className="bg-zinc-100 dark:bg-zinc-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
              Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
              Phone
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
              Email
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
              Address
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-black divide-y divide-zinc-200 dark:divide-zinc-800">
          {clients.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Client List Component (for mobile)
function ClientList({ clients }: { clients: Client[] }) {
  return (
    <div className="md:hidden space-y-3">
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  );
}

// Main Clients Page Component
export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch clients from Supabase
  const fetchClients = useCallback(async () => {
    setLoadingState("loading");
    setError(null);

    try {
      const response = await fetch("/api/clients");

      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.statusText}`);
      }

      const data = await response.json();
      setClients(data.clients || []);
      setLoadingState("success");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setLoadingState("error");
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Filter clients by search query
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render content based on loading/error state
  const renderContent = () => {
    if (loadingState === "loading" || loadingState === "idle") {
      return <LoadingState />;
    }

    if (loadingState === "error") {
      return <ErrorState message={error || "Unknown error"} onRetry={fetchClients} />;
    }

    // Success state
    if (clients.length === 0) {
      return <EmptyState />;
    }

    if (filteredClients.length === 0 && searchQuery) {
      return <NoResultsState searchTerm={searchQuery} />;
    }

    return (
      <>
        <ClientList clients={filteredClients} />
        <ClientTable clients={filteredClients} />
      </>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="p-4 md:p-8 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
            Clients
          </h1>
          <button className="bg-blue-600 text-white rounded-md px-4 py-2 font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <UserPlus size={20} />
            <span className="hidden sm:inline">Add Client</span>
          </button>
        </div>

        {/* Search Bar */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Results Count */}
        {loadingState === "success" && clients.length > 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredClients.length === clients.length
              ? `Showing all ${clients.length} client${clients.length !== 1 ? "s" : ""}`
              : `Found ${filteredClients.length} of ${clients.length} clients`}
          </p>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-8 pt-0">
        {renderContent()}
      </div>
    </div>
  );
}