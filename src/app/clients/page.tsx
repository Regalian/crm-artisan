"use client";

import { useState } from "react";
import { Plus, Search, MapPin, Phone, Mail, Trash2 } from "lucide-react";

// Dummy data for the MVP
const mockClients = [
  { id: 1, name: "Sarah Jenkins", phone: "(555) 123-4567", email: "sarah@example.com", notes: "Gate code: 4321" },
  { id: 2, name: "Property Mgmt Corp", phone: "(555) 987-6543", email: "rep@pmc.com", notes: "Invoice directly to accounting" },
  { id: 3, name: "David Peterson", phone: "(555) 456-7890", email: "", notes: "Beware of dog in backyard" },
];

export default function ClientsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleDelete = (clientName: string) => {
    // Red destructive action with native browser confimation (simplification of a modal for the example)
    if (confirm(`Are you sure you want to completely delete ${clientName}? This action cannot be undone.`)) {
      setToastMessage(`Client ${clientName} successfully deleted.`);
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
    setToastMessage("New client successfully added!");
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <div className="p-4 md:p-8">
      {/* 1. Header & Primary Action (Top Right) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">Clients</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Manage your customer rolodex.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          <Plus size={18} />
          Add Client
        </button>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-black text-zinc-900 dark:text-white text-sm"
          />
        </div>
      </div>

      {/* 2. Responsive Application View */}
      
      {/* A. Desktop View: Data Table (Hidden on Mobile) */}
      <div className="hidden md:block bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-semibold">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Notes</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {mockClients.map((client) => (
              <tr key={client.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{client.name}</td>
                <td className="px-6 py-4">{client.phone}</td>
                <td className="px-6 py-4">{client.email || "-"}</td>
                <td className="px-6 py-4 truncate max-w-xs">{client.notes}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button className="text-zinc-500 hover:text-blue-600 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(client.name)} className="text-red-500 hover:text-red-700 transition-colors">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* B. Mobile View: Stacked Cards (Hidden on Desktop) */}
      <div className="flex flex-col gap-4 md:hidden">
        {mockClients.map((client) => (
          <div key={client.id} className="bg-white dark:bg-black p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">{client.name}</h3>
              <button onClick={() => handleDelete(client.name)} className="text-red-500 hover:text-red-700 p-1">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <span>{client.phone}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>{client.email}</span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="mt-2 text-sm bg-zinc-50 dark:bg-zinc-900 p-2 rounded text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold">Notes:</span> {client.notes}
              </div>
            )}
            
            <button className="mt-2 w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 py-2 rounded-md font-medium text-sm">
              View Profile
            </button>
          </div>
        ))}
      </div>

      {/* 3. Modal Form (Add Client) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-black rounded-lg w-full max-w-md p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">Add New Client</h2>
            <form onSubmit={handleSaveClient} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Full Name</label>
                <input required type="text" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-black dark:text-white" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone</label>
                <input required type="tel" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-black dark:text-white" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes (Optional)</label>
                <textarea rows={2} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-black dark:text-white placeholder-zinc-400" placeholder="Gate codes, warnings..." />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-zinc-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg shadow-lg font-medium text-sm animate-fade-in-up">
          {toastMessage}
        </div>
      )}
    </div>
  );
}