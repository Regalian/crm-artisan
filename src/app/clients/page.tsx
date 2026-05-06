"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Phone, Mail, MapPin, AlertCircle, Loader2, UserPlus, X, CheckCircle, Trash2 } from "lucide-react";

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
function ClientCard({ client, onEdit, onDelete }: { client: Client; onEdit: (client: Client) => void; onDelete: (client: Client) => void }) {
  return (
    <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-3 relative">
      {/* Delete button - top left, always visible on mobile */}
      <button
        onClick={() => onDelete(client)}
        className="absolute top-3 left-3 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all z-10"
        aria-label="Delete client"
      >
        <Trash2 size={16} />
      </button>
      
      {/* Click area for editing - starts after delete button space */}
      <div onClick={() => onEdit(client)} className="pt-8 cursor-pointer">
        <h3 className="font-semibold text-zinc-900 dark:text-white text-lg mb-2">
          {client.name}
        </h3>
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <a
            href={`tel:${client.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
          >
            <Phone size={16} />
            <span>{client.phone}</span>
          </a>
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}

// Client Row Component (for desktop table)
function ClientRow({ client, onEdit, onDelete }: { client: Client; onEdit: (client: Client) => void; onDelete: (client: Client) => void }) {
  return (
    <tr className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white cursor-pointer hover:text-blue-600" onClick={() => onEdit(client)}>
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
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDelete(client)}
          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="Delete client"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}

// Client Table Component (for desktop)
function ClientTable({ clients, onEdit, onDelete }: { clients: Client[]; onEdit: (client: Client) => void; onDelete: (client: Client) => void }) {
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
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-black divide-y divide-zinc-200 dark:divide-zinc-800">
          {clients.map((client) => (
            <ClientRow key={client.id} client={client} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Client List Component (for mobile)
function ClientList({ clients, onEdit, onDelete }: { clients: Client[]; onEdit: (client: Client) => void; onDelete: (client: Client) => void }) {
  return (
    <div className="md:hidden space-y-3">
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

// Client Modal Component
function ClientModal({
  isOpen,
  onClose,
  onSuccess,
  client,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: Client) => void;
  client?: Client | null;
}) {
  const isEditMode = !!client;
  const [formData, setFormData] = useState({
    name: client?.name || "",
    phone: client?.phone || "",
    email: client?.email || "",
    address: client?.address || "",
    notes: client?.notes || "",
  });
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: client?.name || "",
        phone: client?.phone || "",
        email: client?.email || "",
        address: client?.address || "",
        notes: client?.notes || "",
      });
      setErrors({});
    }
  }, [isOpen, client]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string; phone?: string; email?: string } = {};


    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    }

    // Email validation (only if filled)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch("/api/clients" + (isEditMode ? `/${client.id}` : ""), {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEditMode ? "Failed to update client" : "Failed to create client"));
      }

      onSuccess(data.client);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Modal - Centered */}
      <div className="md:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
              {isEditMode ? "Edit Client" : "Add New Client"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* General Error */}
            {errors.general && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                <AlertCircle size={18} />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.name
                    ? "border-red-500 dark:border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                placeholder="John Smith"
                autoComplete="name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.phone
                    ? "border-red-500 dark:border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                placeholder="07700 900123"
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.email
                    ? "border-red-500 dark:border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                placeholder="john@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Address Field */}
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="123 High Street, London"
                autoComplete="street-address"
              />
            </div>

            {/* Notes Field */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Any additional notes about this client..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditMode ? "Update Client" : "Create Client"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>


      {/* Desktop Side Panel */}
      <div className="hidden md:flex fixed inset-y-0 left-64 right-0 z-50">
        {/* Backdrop - subtle */}
        <div className="flex-1 bg-black/20" onClick={onClose} aria-hidden="true" />

        {/* Panel */}
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
              {isEditMode ? "Edit Client" : "Add New Client"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* General Error */}
            {errors.general && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                <AlertCircle size={18} />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label
                htmlFor="name-desktop"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name-desktop"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.name
                    ? "border-red-500 dark:border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                placeholder="John Smith"
                autoComplete="name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label
                htmlFor="phone-desktop"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone-desktop"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.phone
                    ? "border-red-500 dark:border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                placeholder="07700 900123"
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email-desktop"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email-desktop"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.email
                    ? "border-red-500 dark:border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                placeholder="john@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Address Field */}
            <div>
              <label
                htmlFor="address-desktop"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Address
              </label>
              <input
                type="text"
                id="address-desktop"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="123 High Street, London"
                autoComplete="street-address"
              />
            </div>

            {/* Notes Field */}
            <div>
              <label
                htmlFor="notes-desktop"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Notes
              </label>
              <textarea
                id="notes-desktop"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Any additional notes about this client..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-zinc-900 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditMode ? "Update Client" : "Create Client"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Success Toast Component
function SuccessToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg animate-slide-up">
      <CheckCircle size={20} />
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-1 hover:bg-green-500 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Empty State Component
function EmptyState({ onAddClient }: { onAddClient: () => void }) {
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
      <button
        onClick={onAddClient}
        className="bg-blue-600 text-white rounded-md px-6 py-3 font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <UserPlus size={20} />
        Add Your First Client
      </button>
    </div>
  );
}

// Main Clients Page Component
export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Handle successful client create/update
  const handleClientSuccess = (client: Client, isNew: boolean) => {
    if (isNew) {
      setClients((prev) =>
        [client, ...prev].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSuccessMessage(`${client.name} added successfully`);
    } else {
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? client : c)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setSuccessMessage(`${client.name} updated successfully`);
    }
    setIsModalOpen(false);
    setEditingClient(null);
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!deletingClient) return;

    try {
      const response = await fetch(`/api/clients/${deletingClient.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete client");
      }

      setClients((prev) => prev.filter((c) => c.id !== deletingClient.id));
      setSuccessMessage(`${deletingClient.name} deleted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setDeletingClient(null);
    }
  };

  // Open edit modal
  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  // Open add modal
  const handleAddClient = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

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
      return <EmptyState onAddClient={() => setIsModalOpen(true)} />;
    }

    if (filteredClients.length === 0 && searchQuery) {
      return <NoResultsState searchTerm={searchQuery} />;
    }

    return (
      <>
        <ClientList clients={filteredClients} onEdit={handleEdit} onDelete={setDeletingClient} />
        <ClientTable clients={filteredClients} onEdit={handleEdit} onDelete={setDeletingClient} />
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
          <button
            onClick={handleAddClient}
            className="bg-blue-600 text-white rounded-md px-4 py-2 font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
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

      {/* Add/Edit Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingClient(null); }}
        onSuccess={(client) => handleClientSuccess(client, !editingClient)}
        client={editingClient}
      />

      {/* Delete Confirmation Modal */}
      {deletingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeletingClient(null)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-sm mx-auto p-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
                <Trash2 className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Delete Client?
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Are you sure you want to delete <strong>{deletingClient.name}</strong>? This cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeletingClient(null)}
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

      {/* Success Toast */}
      {successMessage && (
        <SuccessToast
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}
    </div>
  );
}
