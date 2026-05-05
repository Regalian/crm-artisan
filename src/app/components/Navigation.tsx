"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, MapPin, FileText, Settings, X } from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/job-sites", icon: MapPin, label: "Job Sites" },
  { href: "/quotes", icon: FileText, label: "Quotes" },
];

// Desktop Sidebar
export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 shrink-0">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">CRM Artisan</h2>
      </div>

      <nav className="flex-1 p-4 space-y-2">
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

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <button className="flex w-full items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors font-medium">
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

// Mobile Header with Drawer
export function MobileNav() {
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
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-200 dark:border-zinc-800">
              <button className="flex w-full items-center gap-3 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors font-medium">
                <Settings size={20} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
