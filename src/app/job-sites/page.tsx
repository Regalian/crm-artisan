"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, AlertCircle, Loader2, Plus, X, CheckCircle, Trash2, Calendar, FileText } from "lucide-react";

// Type definitions - matches Supabase schema
interface Client {
  id: string;
  name: string;
}

interface JobSite {
  id: string;
  client_id: string;
  title: string;
  address: string;
  start_date: string | null;
  end_date: string | null;
  status: "planned" | "in_progress" | "completed";
  notes: string | null;
  created_at: string;
  updated_at: string;
  client: Client;
}

type LoadingState = "idle" | "loading" | "success" | "error";

// Status helpers
const STATUS_CONFIG = {
  planned: { label: "Planned", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  in_progress: { label: "In Progress", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  completed: { label: "Completed", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
};

function StatusBadge({ status }: { status: JobSite["status"] }) {
  const config = STATUS_CONFIG[status];
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
        placeholder="Search job sites by title or address..."
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
      <p className="text-zinc-600 dark:text-zinc-400">Loading your job sites...</p>
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
        No job sites found
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-center">
        No job sites match &ldquo;{searchTerm}&rdquo;. Try a different search.
      </p>
    </div>
  );
}

// Job Site Card Component (for mobile)
function JobSiteCard({ jobSite, onEdit, onDelete, onCreateQuote }: { jobSite: JobSite; onEdit: (jobSite: JobSite) => void; onDelete: (jobSite: JobSite) => void; onCreateQuote: (id: string) => void }) {
  return (
    <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-3 relative">
      {/* Delete button - top right, always visible on mobile */}
      <button
        onClick={() => onDelete(jobSite)}
        className="absolute top-3 right-3 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all z-10"
        aria-label="Delete job site"
      >
        <Trash2 size={16} />
      </button>
      
      {/* Click area for editing */}
      <div onClick={() => onEdit(jobSite)} className="pr-10 cursor-pointer">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-zinc-900 dark:text-white text-lg truncate">
            {jobSite.title}
          </h3>
          <StatusBadge status={jobSite.status} />
        </div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {jobSite.client?.name ?? "Unknown client"}
        </p>
        <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="shrink-0 mt-0.5" />
            <span>{jobSite.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="shrink-0" />
            <span>{formatDate(jobSite.start_date)}{jobSite.end_date ? ` → ${formatDate(jobSite.end_date)}` : ""}</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onCreateQuote(jobSite.id); }}
          className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <FileText size={14} />
          View Quotes
        </button>
        {jobSite.notes && (
          <p className="mt-3 text-xs text-zinc-500 italic border-t border-zinc-100 dark:border-zinc-800 pt-2">
            {jobSite.notes}
          </p>
        )}
      </div>
    </div>
  );
}

// Job Site Row Component (for desktop table)
function JobSiteRow({ jobSite, onEdit, onDelete, onCreateQuote }: { jobSite: JobSite; onEdit: (jobSite: JobSite) => void; onDelete: (jobSite: JobSite) => void; onCreateQuote: (id: string) => void }) {
  return (
    <tr className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white cursor-pointer hover:text-blue-600" onClick={() => onEdit(jobSite)}>
        {jobSite.title}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-blue-600" onClick={() => onEdit(jobSite)}>
        {jobSite.client?.name ?? "Unknown client"}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="shrink-0" />
          <span className="max-w-xs truncate" title={jobSite.address}>
            {jobSite.address}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={jobSite.status} />
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
        {formatDate(jobSite.start_date)}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onCreateQuote(jobSite.id)}
          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          aria-label="View quotes"
        >
          <FileText size={18} />
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDelete(jobSite)}
          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="Delete job site"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}

// Job Site Table Component (for desktop)
function JobSiteTable({ jobSites, onEdit, onDelete, onCreateQuote }: { jobSites: JobSite[]; onEdit: (jobSite: JobSite) => void; onDelete: (jobSite: JobSite) => void; onCreateQuote: (id: string) => void }) {
  return (
    <div className="hidden md:block overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full">
        <thead className="bg-zinc-100 dark:bg-zinc-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
              Title
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
              Client
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
              Address
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
              Start Date
            </th>
            <th className="w-16"></th>
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-black divide-y divide-zinc-200 dark:divide-zinc-800">
          {jobSites.map((jobSite) => (
            <JobSiteRow key={jobSite.id} jobSite={jobSite} onEdit={onEdit} onDelete={onDelete} onCreateQuote={onCreateQuote} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Job Site List Component (for mobile)
function JobSiteList({ jobSites, onEdit, onDelete, onCreateQuote }: { jobSites: JobSite[]; onEdit: (jobSite: JobSite) => void; onDelete: (jobSite: JobSite) => void; onCreateQuote: (id: string) => void }) {
  return (
    <div className="md:hidden space-y-3">
      {jobSites.map((jobSite) => (
        <JobSiteCard key={jobSite.id} jobSite={jobSite} onEdit={onEdit} onDelete={onDelete} onCreateQuote={onCreateQuote} />
      ))}
    </div>
  );
}

// Job Site Modal Component
function JobSiteModal({
  isOpen,
  onClose,
  onSuccess,
  jobSite,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (jobSite: JobSite) => void;
  jobSite?: JobSite | null;
}) {
  const isEditMode = !!jobSite;
  const [formData, setFormData] = useState({
    client_id: jobSite?.client_id || "",
    title: jobSite?.title || "",
    address: jobSite?.address || "",
    start_date: jobSite?.start_date || "",
    end_date: jobSite?.end_date || "",
    status: jobSite?.status || "planned" as JobSite["status"],
    notes: jobSite?.notes || "",
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [errors, setErrors] = useState<{ client_id?: string; title?: string; address?: string; dates?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch clients when modal opens (for the dropdown)
  useEffect(() => {
    if (isOpen) {
      setClientsLoading(true);
      fetch("/api/clients")
        .then((res) => res.json())
        .then((data) => {
          setClients(data.clients || []);
          setClientsLoading(false);
        })
        .catch(() => setClientsLoading(false));
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        client_id: jobSite?.client_id || "",
        title: jobSite?.title || "",
        address: jobSite?.address || "",
        start_date: jobSite?.start_date || "",
        end_date: jobSite?.end_date || "",
        status: jobSite?.status || "planned",
        notes: jobSite?.notes || "",
      });
      setErrors({});
    }
  }, [isOpen, jobSite]);

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
    const newErrors: { client_id?: string; title?: string; address?: string; dates?: string } = {};

    if (!formData.client_id) {
      newErrors.client_id = "Please select a client";
    }

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
      newErrors.dates = "Start date must be before end date";
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
      const response = await fetch("/api/job-sites" + (isEditMode ? `/${jobSite.id}` : ""), {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: formData.client_id,
          title: formData.title.trim(),
          address: formData.address.trim(),
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          status: formData.status,
          notes: formData.notes.trim() || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEditMode ? "Failed to update job site" : "Failed to create job site"));
      }

      onSuccess(data.job_site);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  if (!isOpen) return null;

  const renderFormFields = (idSuffix: string) => (
    <>
      {/* Client Field */}
      <div>
        <label
          htmlFor={`client-${idSuffix}`}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Client <span className="text-red-500">*</span>
        </label>
        <select
          id={`client-${idSuffix}`}
          name="client_id"
          value={formData.client_id}
          onChange={handleChange}
          disabled={clientsLoading}
          className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            errors.client_id
              ? "border-red-500 dark:border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          } ${clientsLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <option value="">Select a client...</option>
          {clients
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
        </select>
        {errors.client_id && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.client_id}
          </p>
        )}
        {clientsLoading && (
          <p className="mt-1 text-sm text-zinc-500 flex items-center gap-1">
            <Loader2 size={14} className="animate-spin" />
            Loading clients...
          </p>
        )}
      </div>

      {/* Title Field */}
      <div>
        <label
          htmlFor={`title-${idSuffix}`}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id={`title-${idSuffix}`}
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            errors.title
              ? "border-red-500 dark:border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
          placeholder="Kitchen rewiring"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.title}
          </p>
        )}
      </div>

      {/* Address Field */}
      <div>
        <label
          htmlFor={`address-${idSuffix}`}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id={`address-${idSuffix}`}
          name="address"
          value={formData.address}
          onChange={handleChange}
          className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            errors.address
              ? "border-red-500 dark:border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
          placeholder="42 Elm Street, London"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.address}
          </p>
        )}
      </div>

      {/* Start Date Field */}
      <div>
        <label
          htmlFor={`start_date-${idSuffix}`}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Start Date
        </label>
        <input
          type="date"
          id={`start_date-${idSuffix}`}
          name="start_date"
          value={formData.start_date}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* End Date Field */}
      <div>
        <label
          htmlFor={`end_date-${idSuffix}`}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          End Date
        </label>
        <input
          type="date"
          id={`end_date-${idSuffix}`}
          name="end_date"
          value={formData.end_date}
          onChange={handleChange}
          className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            errors.dates ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
        {errors.dates && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.dates}
          </p>
        )}
      </div>

      {/* Status Field */}
      <div>
        <label
          htmlFor={`status-${idSuffix}`}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Status
        </label>
        <select
          id={`status-${idSuffix}`}
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Notes Field */}
      <div>
        <label
          htmlFor={`notes-${idSuffix}`}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Notes
        </label>
        <textarea
          id={`notes-${idSuffix}`}
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
          placeholder="Access instructions, gate codes, etc..."
        />
      </div>
    </>
  );

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
              {isEditMode ? "Edit Job Site" : "Add New Job Site"}
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

            {renderFormFields("mobile")}

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
                  isEditMode ? "Update Job Site" : "Create Job Site"
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
              {isEditMode ? "Edit Job Site" : "Add New Job Site"}
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

            {renderFormFields("desktop")}

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
                  isEditMode ? "Update Job Site" : "Create Job Site"
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
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full p-6 mb-4">
        <MapPin className="text-zinc-400" size={48} />
      </div>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
        No job sites yet
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-sm mb-6">
        Start by adding a job site. Link it to a client and track work across multiple locations.
      </p>
      <button
        onClick={onAdd}
        className="bg-blue-600 text-white rounded-md px-6 py-3 font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <Plus size={20} />
        Add Your First Job Site
      </button>
    </div>
  );
}

// Main Job Sites Page Component
export default function JobSitesPage() {
  const router = useRouter();
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobSite, setEditingJobSite] = useState<JobSite | null>(null);
  const [deletingJobSite, setDeletingJobSite] = useState<JobSite | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch job sites from API
  const fetchJobSites = useCallback(async () => {
    setLoadingState("loading");
    setError(null);

    try {
      const response = await fetch("/api/job-sites");

      if (!response.ok) {
        throw new Error(`Failed to fetch job sites: ${response.statusText}`);
      }

      const data = await response.json();
      setJobSites(data.job_sites || []);
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
    fetchJobSites();
  }, [fetchJobSites]);

  // Filter job sites by search query and status
  const filteredJobSites = jobSites.filter((js) => {
    const clientName = js.client?.name ?? "";
    const matchesSearch =
      !searchQuery ||
      js.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      js.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || js.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle successful job site create/update
  const handleJobSiteSuccess = (jobSite: JobSite, isNew: boolean) => {
    if (isNew) {
      setJobSites((prev) =>
        [jobSite, ...prev].sort((a, b) => a.title.localeCompare(b.title))
      );
      setSuccessMessage(`${jobSite.title} added successfully`);
    } else {
      setJobSites((prev) =>
        prev.map((js) => (js.id === jobSite.id ? jobSite : js)).sort((a, b) => a.title.localeCompare(b.title))
      );
      setSuccessMessage(`${jobSite.title} updated successfully`);
    }
    setIsModalOpen(false);
    setEditingJobSite(null);
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!deletingJobSite) return;

    try {
      const response = await fetch(`/api/job-sites/${deletingJobSite.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete job site");
      }

      setJobSites((prev) => prev.filter((js) => js.id !== deletingJobSite.id));
      setSuccessMessage(`${deletingJobSite.title} deleted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete job site");
    } finally {
      setDeletingJobSite(null);
    }
  };

  // Open edit modal
  const handleEdit = (jobSite: JobSite) => {
    setEditingJobSite(jobSite);
    setIsModalOpen(true);
  };

  // Open add modal
  const handleAdd = () => {
    setEditingJobSite(null);
    setIsModalOpen(true);
  };

  // Render content based on loading/error state
  const renderContent = () => {
    if (loadingState === "loading" || loadingState === "idle") {
      return <LoadingState />;
    }

    if (loadingState === "error") {
      return <ErrorState message={error || "Unknown error"} onRetry={fetchJobSites} />;
    }

    // Success state
    if (jobSites.length === 0) {
      return <EmptyState onAdd={() => setIsModalOpen(true)} />;
    }

    if (filteredJobSites.length === 0 && (searchQuery || statusFilter !== "all")) {
      return <NoResultsState searchTerm={searchQuery} />;
    }

    return (
      <>
        <JobSiteList jobSites={filteredJobSites} onEdit={handleEdit} onDelete={setDeletingJobSite} onCreateQuote={(id) => router.push(`/job-sites/${id}/quotes/new`)} />
        <JobSiteTable jobSites={filteredJobSites} onEdit={handleEdit} onDelete={setDeletingJobSite} onCreateQuote={(id) => router.push(`/job-sites/${id}/quotes/new`)} />
      </>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="p-4 md:p-8 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
            Job Sites
          </h1>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white rounded-md px-4 py-2 font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Job Site</span>
          </button>
        </div>

        {/* Search Bar */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Filters Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label
              htmlFor="status-filter"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="all">All</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Results Count */}
          {loadingState === "success" && jobSites.length > 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredJobSites.length === jobSites.length
                ? `Showing all ${jobSites.length} site${jobSites.length !== 1 ? "s" : ""}`
                : `Found ${filteredJobSites.length} of ${jobSites.length} sites`}
            </p>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-8 pt-0">
        {renderContent()}
      </div>

      {/* Add/Edit Job Site Modal */}
      <JobSiteModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingJobSite(null); }}
        onSuccess={(js) => handleJobSiteSuccess(js, !editingJobSite)}
        jobSite={editingJobSite}
      />

      {/* Delete Confirmation Modal */}
      {deletingJobSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeletingJobSite(null)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-sm mx-auto p-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
                <Trash2 className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Delete Job Site?
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Are you sure you want to delete <strong>{deletingJobSite.title}</strong>? This cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeletingJobSite(null)}
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
