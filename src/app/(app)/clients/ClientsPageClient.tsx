"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Mail,
  MapPin,
  Phone,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResponsiveFormShell } from "@/components/ui/ResponsiveFormShell";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { validateClientInput, type ClientValidationErrors } from "@/lib/client-validation";

type Client = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

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
        placeholder="Search clients by name..."
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
      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">No clients found</h3>
      <p className="text-center text-zinc-600 dark:text-zinc-400">
        No clients match &ldquo;{searchTerm}&rdquo;. Try a different name.
      </p>
    </div>
  );
}

function ClientCard({
  client,
  onEdit,
  onDelete,
}: {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}) {
  return (
    <div className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
      <button
        onClick={() => onDelete(client)}
        className="absolute right-3 top-3 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
        aria-label="Delete client"
      >
        <Trash2 size={16} />
      </button>

      <div onClick={() => onEdit(client)} className="cursor-pointer pr-10">
        <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">{client.name}</h3>
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <a
            href={`tel:${client.phone}`}
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-2 transition-colors hover:text-blue-600"
          >
            <Phone size={16} />
            <span>{client.phone}</span>
          </a>
          {client.email ? (
            <a
              href={`mailto:${client.email}`}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-2 transition-colors hover:text-blue-600"
            >
              <Mail size={16} />
              <span>{client.email}</span>
            </a>
          ) : null}
          {client.address ? (
            <div className="flex items-start gap-2 text-zinc-500">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              <span>{client.address}</span>
            </div>
          ) : null}
        </div>
        {client.notes ? (
          <p className="mt-3 border-t border-zinc-100 pt-2 text-xs italic text-zinc-500 dark:border-zinc-800">
            {client.notes}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ClientTable({
  clients,
  onEdit,
  onDelete,
}: {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 md:block">
      <table className="w-full min-w-[640px]">
        <thead className="bg-zinc-100 dark:bg-zinc-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Name</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Phone</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Email</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Address</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-black">
          {clients.map((client) => (
            <tr key={client.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <td
                className="cursor-pointer whitespace-nowrap px-4 py-3 font-medium text-zinc-900 hover:text-blue-600 dark:text-white"
                onClick={() => onEdit(client)}
              >
                {client.name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                <a href={`tel:${client.phone}`} className="flex items-center gap-2 transition-colors hover:text-blue-600">
                  <Phone size={16} />
                  <span>{client.phone}</span>
                </a>
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {client.email ? (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 transition-colors hover:text-blue-600">
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
              <td className="px-2 py-3 text-right">
                <button
                  onClick={() => onDelete(client)}
                  className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label="Delete client"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientForm({
  client,
  onClose,
  onSuccess,
}: {
  client: Client | null;
  onClose: () => void;
  onSuccess: (client: Client, isNew: boolean) => void;
}) {
  const isEditMode = Boolean(client);
  const { error } = useToast();
  const [formData, setFormData] = useState({
    name: client?.name ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    address: client?.address ?? "",
    notes: client?.notes ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<ClientValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));

    if (fieldErrors[name as keyof ClientValidationErrors]) {
      setFieldErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const renderError = (message?: string) =>
    message ? (
      <p className="mt-1 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
        <AlertCircle size={14} />
        {message}
      </p>
    ) : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateClientInput(formData, { requirePhone: true });
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/clients${isEditMode ? `/${client?.id}` : ""}`, {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEditMode ? "Failed to update client" : "Failed to create client"));
      }

      onSuccess(data.client as Client, !isEditMode);
      onClose();
    } catch (submitError) {
      error(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormShell
      isOpen
      title={isEditMode ? "Edit Client" : "Add New Client"}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="client-form" fullWidth disabled={isSubmitting}>
            {isSubmitting ? (isEditMode ? "Updating..." : "Creating...") : isEditMode ? "Update Client" : "Create Client"}
          </Button>
        </div>
      }
    >
      <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="client-name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="client-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white ${fieldErrors.name ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"}`}
            placeholder="John Smith"
            autoComplete="name"
          />
          {renderError(fieldErrors.name)}
        </div>

        <div>
          <label htmlFor="client-phone" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            id="client-phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white ${fieldErrors.phone ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"}`}
            placeholder="07700 900123"
            autoComplete="tel"
          />
          {renderError(fieldErrors.phone)}
        </div>

        <div>
          <label htmlFor="client-email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="client-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white ${fieldErrors.email ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"}`}
            placeholder="john@example.com"
            autoComplete="email"
          />
          {renderError(fieldErrors.email)}
        </div>

        <div>
          <label htmlFor="client-address" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Address</label>
          <input
            id="client-address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="123 High Street, London"
            autoComplete="street-address"
          />
        </div>

        <div>
          <label htmlFor="client-notes" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes</label>
          <textarea
            id="client-notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full resize-none rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="Any additional notes about this client..."
          />
        </div>
      </form>
    </ResponsiveFormShell>
  );
}

export default function ClientsPageClient({ initialClients }: { initialClients: Client[] }) {
  const { success, error } = useToast();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const filteredClients = useMemo(
    () =>
      clients.filter((client) =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [clients, searchQuery],
  );

  const openCreate = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleClientSaved = (savedClient: Client, isNew: boolean) => {
    setClients((current) => {
      const next = isNew
        ? [savedClient, ...current]
        : current.map((client) => (client.id === savedClient.id ? savedClient : client));

      return [...next].sort((a, b) => a.name.localeCompare(b.name));
    });

    success(isNew ? `${savedClient.name} added successfully` : `${savedClient.name} updated successfully`);
  };

  const handleDelete = async () => {
    if (!deletingClient) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${deletingClient.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete client");
      }

      setClients((current) => current.filter((client) => client.id !== deletingClient.id));
      success(`${deletingClient.name} deleted`);
    } catch (deleteError) {
      error(deleteError instanceof Error ? deleteError.message : "Failed to delete client");
    } finally {
      setDeletingClient(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 p-4 pb-0 md:p-8 md:pb-0">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">Clients</h1>
          <Button onClick={openCreate} leadingIcon={<UserPlus size={20} />}>
            <span className="hidden sm:inline">Add Client</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        {clients.length > 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredClients.length === clients.length
              ? `Showing all ${clients.length} client${clients.length !== 1 ? "s" : ""}`
              : `Found ${filteredClients.length} of ${clients.length} clients`}
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto p-4 pt-0 md:p-8 md:pt-0">
        {clients.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="text-zinc-400" size={48} />}
            title="No clients yet"
            description="Start by adding your first client. You can store contact details now and link job sites later."
            actionLabel="Add Your First Client"
            onAction={openCreate}
          />
        ) : filteredClients.length === 0 && searchQuery ? (
          <NoResultsState searchTerm={searchQuery} />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredClients.map((client) => (
                <ClientCard key={client.id} client={client} onEdit={openEdit} onDelete={setDeletingClient} />
              ))}
            </div>
            <ClientTable clients={filteredClients} onEdit={openEdit} onDelete={setDeletingClient} />
          </>
        )}
      </div>

      {isModalOpen ? (
        <ClientForm
          key={editingClient?.id ?? "new-client"}
          client={editingClient}
          onClose={() => {
            setIsModalOpen(false);
            setEditingClient(null);
          }}
          onSuccess={handleClientSaved}
        />
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(deletingClient)}
        title="Delete Client?"
        message={`Are you sure you want to delete ${deletingClient?.name ? `“${deletingClient.name}”` : "this client"}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingClient(null)}
      />
    </div>
  );
}
