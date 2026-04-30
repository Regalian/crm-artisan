import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM Artisan",
  description: "Independent Artisan CRM",
};

import Link from "next/link";
import { LayoutDashboard, Users, MapPin, FileText, Settings } from "lucide-react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900 font-sans text-zinc-900 dark:text-white">
        
        {/* Sidebar - Desktop Only */}
        <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">CRM Artisan</h2>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors font-medium">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link href="/clients" className="flex items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors font-medium">
              <Users size={20} />
              <span>Clients</span>
            </Link>
            <Link href="/job-sites" className="flex items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors font-medium">
              <MapPin size={20} />
              <span>Job Sites</span>
            </Link>
            <Link href="/quotes" className="flex items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors font-medium">
              <FileText size={20} />
              <span>Quotes</span>
            </Link>
          </nav>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <button className="flex w-full items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors font-medium">
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          {/* Mobile Header (fallback when sidebar is hidden) */}
          <header className="md:hidden flex shrink-0 items-center justify-between p-4 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">CRM Artisan</h2>
            <button className="text-zinc-600 dark:text-zinc-400 p-1">
              <LayoutDashboard size={24} />
            </button>
          </header>
          
          {/* Scrollable Page Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
