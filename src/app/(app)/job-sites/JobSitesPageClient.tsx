"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  ClipboardList,
  Crown,
  MapPin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import type { BillingAccessSnapshot } from "@/lib/billing-access";
import { hasUnlimitedJobSitesAccess } from "@/lib/billing-access";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResponsiveFormShell } from "@/components/ui/ResponsiveFormShell";
import { useToast } from "@/components/ui/ToastProvider";
import {
  getAllowedJobSiteStatusTransitions,
  JOB_SITE_STATUS_LABELS,
  type JobSiteStatus,
} from "@/lib/job-site-status";
import {
  countActiveJobSites,
  FREE_ACTIVE_JOB_SITE_LIMIT,
  JOB_SITE_LIMIT_ERROR_CODE,
  JOB_SITE_LIMIT_MESSAGE,
} from "@/lib/job-site-limits";
import {
  validateJobSiteInput,
  type JobSiteValidationErrors,
} from "@/lib/job-site-validation";

type Client = {
  id: string;
  name: string;
};

type JobSite = {
  id: string;
  client_id: string;
  title: string;
  address: string;
  start_date: string | null;
  end_date: string | null;
  status: JobSiteStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client: Client;
};

type JobSiteApiResponse = {
  error?: string;
  code?: string;
  job_site?: JobSite;
};

const statusConfig: Record<JobSiteStatus, { label: string; bg: string; text: string }> = {
  planned: {
    label: JOB_SITE_STATUS_LABELS.planned,
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
  },
  in_progress: {
    label: JOB_SITE_STATUS_LABELS.in_progress,
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  completed: {
    label: JOB_SITE_STATUS_LABELS.completed,
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
  },
};

function StatusBadge({ status }: { status: JobSiteStatus }) {
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
        placeholder="Search job sites by title or address..."
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
      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">No job sites found</h3>
      <p className="text-center text-zinc-600 dark:text-zinc-400">
        {searchTerm
          ? `No job sites match “${searchTerm}”. Try a different search.`
          : "No job sites match your current filter."}
      </p>
    </div>
  );
}

function JobSiteCard({
  jobSite,
  onEdit,
  onDelete,
  onCreateQuote,
}: {
  jobSite: JobSite;
  onEdit: (jobSite: JobSite) => void;
  onDelete: (jobSite: JobSite) => void;
  onCreateQuote: (id: string) => void;
}) {
  return (
    <div className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
      <button
        onClick={() => onDelete(jobSite)}
        className="absolute right-3 top-3 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
        aria-label="Delete job site"
      >
        <Trash2 size={16} />
      </button>

      <div onClick={() => onEdit(jobSite)} className="cursor-pointer pr-10">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="truncate text-lg font-semibold text-zinc-900 dark:text-white">{jobSite.title}</h3>
          <StatusBadge status={jobSite.status} />
        </div>
        <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{jobSite.client?.name ?? "Unknown client"}</p>
        <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            <span>{jobSite.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="shrink-0" />
            <span>
              {formatDate(jobSite.start_date)}
              {jobSite.end_date ? ` → ${formatDate(jobSite.end_date)}` : ""}
            </span>
          </div>
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onCreateQuote(jobSite.id);
          }}
          className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <ClipboardList size={14} />
          New Quote
        </button>
        {jobSite.notes ? (
          <p className="mt-3 border-t border-zinc-100 pt-2 text-xs italic text-zinc-500 dark:border-zinc-800">
            {jobSite.notes}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function JobSiteTable({
  jobSites,
  onEdit,
  onDelete,
  onCreateQuote,
}: {
  jobSites: JobSite[];
  onEdit: (jobSite: JobSite) => void;
  onDelete: (jobSite: JobSite) => void;
  onCreateQuote: (id: string) => void;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 md:block">
      <table className="w-full">
        <thead className="bg-zinc-100 dark:bg-zinc-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Title</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Client</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Address</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">Start Date</th>
            <th className="w-12" />
            <th className="w-12" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-black">
          {jobSites.map((jobSite) => (
            <tr key={jobSite.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <td className="cursor-pointer px-4 py-3 font-medium text-zinc-900 hover:text-blue-600 dark:text-white" onClick={() => onEdit(jobSite)}>
                {jobSite.title}
              </td>
              <td className="cursor-pointer px-4 py-3 text-zinc-600 hover:text-blue-600 dark:text-zinc-400" onClick={() => onEdit(jobSite)}>
                {jobSite.client?.name ?? "Unknown client"}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0" />
                  <span className="max-w-xs truncate" title={jobSite.address}>{jobSite.address}</span>
                </div>
              </td>
              <td className="px-4 py-3"><StatusBadge status={jobSite.status} /></td>
              <td className="whitespace-nowrap px-2 py-3 text-zinc-600 dark:text-zinc-400">{formatDate(jobSite.start_date)}</td>
              <td className="px-1 py-3">
                <button
                  onClick={() => onCreateQuote(jobSite.id)}
                  className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  aria-label="Create quote"
                >
                  <ClipboardList size={18} />
                </button>
              </td>
              <td className="px-1 py-3 text-right">
                <button
                  onClick={() => onDelete(jobSite)}
                  className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label="Delete job site"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobSiteForm({
  jobSite,
  clients,
  onClose,
  onSuccess,
  onLimitReached,
}: {
  jobSite: JobSite | null;
  clients: Client[];
  onClose: () => void;
  onSuccess: (jobSite: JobSite, isNew: boolean) => void;
  onLimitReached: () => void;
}) {
  const isEditMode = Boolean(jobSite);
  const { error } = useToast();
  const [formData, setFormData] = useState({
    client_id: jobSite?.client_id ?? "",
    title: jobSite?.title ?? "",
    address: jobSite?.address ?? "",
    start_date: jobSite?.start_date ?? "",
    end_date: jobSite?.end_date ?? "",
    status: jobSite?.status ?? ("planned" as JobSiteStatus),
    notes: jobSite?.notes ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<JobSiteValidationErrors & { general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableStatuses = isEditMode && jobSite
    ? getAllowedJobSiteStatusTransitions(jobSite.status)
    : (["planned", "in_progress", "completed"] as const);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === "status" ? (value as JobSiteStatus) : value,
    }));

    if (fieldErrors[name as keyof typeof fieldErrors]) {
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

    const errors = validateJobSiteInput(formData, {
      requireClient: true,
      currentStatus: isEditMode && jobSite ? jobSite.status : undefined,
      transitionErrorFormat: "label",
    });
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/job-sites${isEditMode ? `/${jobSite?.id}` : ""}`, {
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
      const data = await response.json() as JobSiteApiResponse;

      if (!response.ok) {
        if (data.code === JOB_SITE_LIMIT_ERROR_CODE) {
          if (!isEditMode) {
            onClose();
            onLimitReached();
            return;
          }

          setFieldErrors((current) => ({
            ...current,
            general: data.error ?? JOB_SITE_LIMIT_MESSAGE,
          }));
          return;
        }

        throw new Error(data.error || (isEditMode ? "Failed to update job site" : "Failed to create job site"));
      }

      onSuccess(data.job_site as JobSite, !isEditMode);
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
      title={isEditMode ? "Edit Job Site" : "Add New Job Site"}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="job-site-form" fullWidth disabled={isSubmitting}>
            {isSubmitting ? (isEditMode ? "Updating..." : "Creating...") : isEditMode ? "Update Job Site" : "Create Job Site"}
          </Button>
        </div>
      }
    >
      <form id="job-site-form" onSubmit={handleSubmit} className="space-y-4">
        {fieldErrors.general ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle size={18} />
            <span>{fieldErrors.general}</span>
          </div>
        ) : null}

        <div>
          <label htmlFor="job-site-client" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Client <span className="text-red-500">*</span>
          </label>
          <select
            id="job-site-client"
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-2.5 text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white ${fieldErrors.client_id ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"}`}
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          {renderError(fieldErrors.client_id)}
        </div>

        <div>
          <label htmlFor="job-site-title" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="job-site-title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white ${fieldErrors.title ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"}`}
            placeholder="Kitchen rewiring"
          />
          {renderError(fieldErrors.title)}
        </div>

        <div>
          <label htmlFor="job-site-address" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Address <span className="text-red-500">*</span>
          </label>
          <input
            id="job-site-address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white ${fieldErrors.address ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"}`}
            placeholder="42 Elm Street, London"
          />
          {renderError(fieldErrors.address)}
        </div>

        <div>
          <label htmlFor="job-site-start-date" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Start Date</label>
          <input
            id="job-site-start-date"
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={handleChange}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="job-site-end-date" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">End Date</label>
          <input
            id="job-site-end-date"
            name="end_date"
            type="date"
            value={formData.end_date}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-2.5 text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white ${fieldErrors.dates ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"}`}
          />
          {renderError(fieldErrors.dates)}
        </div>

        <div>
          <label htmlFor="job-site-status" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
          <select
            id="job-site-status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-2.5 text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white ${fieldErrors.status ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"}`}
          >
            {availableStatuses.map((status) => (
              <option key={status} value={status}>{statusConfig[status].label}</option>
            ))}
          </select>
          {renderError(fieldErrors.status)}
        </div>

        <div>
          <label htmlFor="job-site-notes" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes</label>
          <textarea
            id="job-site-notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full resize-none rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="Access instructions, gate codes, etc..."
          />
        </div>
      </form>
    </ResponsiveFormShell>
  );
}

function UpgradeToPremiumDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-job-site-limit-title"
        className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-amber-100 p-4 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            <Crown size={30} />
          </div>
          <h2 id="upgrade-job-site-limit-title" className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
            You&apos;ve hit the free tier limit
          </h2>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Upgrade to Premium for unlimited job sites.
          </p>
          <div className="flex w-full gap-3">
            <Button variant="secondary" fullWidth onClick={onClose}>
              Maybe Later
            </Button>
            <form action="/api/stripe/checkout" method="POST" className="w-full">
              <Button type="submit" fullWidth className="cursor-pointer" leadingIcon={<Crown size={16} />}>
                Upgrade
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobSitesPageClient({
  initialJobSites,
  availableClients,
  initialBilling,
}: {
  initialJobSites: JobSite[];
  availableClients: Client[];
  initialBilling: BillingAccessSnapshot;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [jobSites, setJobSites] = useState<JobSite[]>(initialJobSites);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [editingJobSite, setEditingJobSite] = useState<JobSite | null>(null);
  const [deletingJobSite, setDeletingJobSite] = useState<JobSite | null>(null);

  const filteredJobSites = useMemo(() => {
    return jobSites.filter((jobSite) => {
      const clientName = jobSite.client?.name ?? "";
      const matchesSearch =
        !searchQuery ||
        jobSite.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        jobSite.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clientName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || jobSite.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobSites, searchQuery, statusFilter]);

  const activeJobSitesCount = useMemo(() => countActiveJobSites(jobSites), [jobSites]);
  const hasUnlimitedJobSites = hasUnlimitedJobSitesAccess(initialBilling);
  const hasReachedFreeTierLimit = !hasUnlimitedJobSites && activeJobSitesCount >= FREE_ACTIVE_JOB_SITE_LIMIT;

  const openCreate = () => {
    if (hasReachedFreeTierLimit) {
      setIsUpgradeModalOpen(true);
      return;
    }

    setEditingJobSite(null);
    setIsModalOpen(true);
  };

  const openEdit = (jobSite: JobSite) => {
    setEditingJobSite(jobSite);
    setIsModalOpen(true);
  };

  const handleSaved = (savedJobSite: JobSite, isNew: boolean) => {
    setJobSites((current) => {
      const next = isNew
        ? [savedJobSite, ...current]
        : current.map((jobSite) => (jobSite.id === savedJobSite.id ? savedJobSite : jobSite));
      return [...next].sort((a, b) => a.title.localeCompare(b.title));
    });

    success(isNew ? `${savedJobSite.title} added successfully` : `${savedJobSite.title} updated successfully`);
  };

  const handleDelete = async () => {
    if (!deletingJobSite) {
      return;
    }

    try {
      const response = await fetch(`/api/job-sites/${deletingJobSite.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete job site");
      }

      setJobSites((current) => current.filter((jobSite) => jobSite.id !== deletingJobSite.id));
      success(`${deletingJobSite.title} deleted`);
    } catch (deleteError) {
      error(deleteError instanceof Error ? deleteError.message : "Failed to delete job site");
    } finally {
      setDeletingJobSite(null);
    }
  };

  const sortedClients = useMemo(
    () => [...availableClients].sort((a, b) => a.name.localeCompare(b.name)),
    [availableClients],
  );
  const hasClients = availableClients.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 p-4 pb-0 md:p-8 md:pb-0">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">Job Sites</h1>
          <Button onClick={openCreate} leadingIcon={<Plus size={20} />} disabled={!hasClients} title={!hasClients ? "Add a client first" : undefined}>
            <span className="hidden sm:inline">Add Job Site</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label htmlFor="status-filter" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="all">All</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {jobSites.length > 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredJobSites.length === jobSites.length
                ? `Showing all ${jobSites.length} site${jobSites.length !== 1 ? "s" : ""}`
                : `Found ${filteredJobSites.length} of ${jobSites.length} sites`}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 pt-0 md:p-8 md:pt-0">
        {!hasClients ? (
          <EmptyState
            icon={<MapPin className="text-zinc-400" size={48} />}
            title="Add a client before creating a job site"
            description="Job sites belong to clients. Add your first client, then you can create job sites and quotes from the road."
            actionLabel="Add Your First Client"
            onAction={() => router.push("/clients")}
          />
        ) : jobSites.length === 0 ? (
          <EmptyState
            icon={<MapPin className="text-zinc-400" size={48} />}
            title="No job sites yet"
            description="Add your first job site to track work locations and create quotes from the road."
            actionLabel="Add Your First Job Site"
            onAction={openCreate}
          />
        ) : filteredJobSites.length === 0 ? (
          <NoResultsState searchTerm={searchQuery} />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredJobSites.map((jobSite) => (
                <JobSiteCard
                  key={jobSite.id}
                  jobSite={jobSite}
                  onEdit={openEdit}
                  onDelete={setDeletingJobSite}
                  onCreateQuote={(id) => router.push(`/job-sites/${id}/quotes/new`)}
                />
              ))}
            </div>
            <JobSiteTable
              jobSites={filteredJobSites}
              onEdit={openEdit}
              onDelete={setDeletingJobSite}
              onCreateQuote={(id) => router.push(`/job-sites/${id}/quotes/new`)}
            />
          </>
        )}
      </div>

      {isModalOpen ? (
        <JobSiteForm
          key={editingJobSite?.id ?? "new-job-site"}
          jobSite={editingJobSite}
          clients={sortedClients}
          onClose={() => {
            setIsModalOpen(false);
            setEditingJobSite(null);
          }}
          onSuccess={handleSaved}
          onLimitReached={() => {
            setIsUpgradeModalOpen(true);
          }}
        />
      ) : null}

      <UpgradeToPremiumDialog isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />

      <ConfirmDialog
        isOpen={Boolean(deletingJobSite)}
        title="Delete Job Site?"
        message={`Are you sure you want to delete ${deletingJobSite?.title ? `“${deletingJobSite.title}”` : "this job site"}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingJobSite(null)}
      />
    </div>
  );
}
