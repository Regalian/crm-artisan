"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, MapPin, FileText, LogOut, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { logout } from "@/app/actions/auth";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/job-sites", icon: MapPin, label: "Job Sites" },
  { href: "/quotes", icon: FileText, label: "Quotes" },
];

// User avatar / email section for sidebar
function UserSection({ user }: { user: User | null }) {
  const email = user?.email ?? "Unknown";
  const initials = email.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 px-3 py-2 mb-2">
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{email}</p>
      </div>
    </div>
  );
}

// Desktop Sidebar
export function DesktopSidebar({ user }: { user: User | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 shrink-0">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">CRM Artisan</h2>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-medium ${
              pathname === item.href
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        <UserSection user={user} />
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

// Mobile Header with Drawer
export function MobileNav({ user }: { user: User | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="md:hidden flex shrink-0 items-center justify-between p-4 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">CRM Artisan</h2>
        <button
          onClick={() => setIsOpen(true)}
          className="text-zinc-600 dark:text-zinc-400 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 bg-white dark:bg-black border-l border-zinc-200 dark:border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Menu</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-600 dark:text-zinc-400"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors font-medium ${
                    pathname === item.href
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            {/* User info + logout */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <UserSection user={user} />
              <form action={logout}>
                <button
                  type="submit"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors font-medium"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
