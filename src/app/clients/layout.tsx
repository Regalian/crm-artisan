import Link from "next/link";
import { LayoutDashboard, Users, MapPin, FileText, Settings } from "lucide-react";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900 font-sans">
      {/* Sidebar - Desktop Only (Mobile would use a hamburger menu, kept simple for MVP) */}
      <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">CRM Artisan</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors">
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/clients" className="flex items-center gap-3 px-3 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-md transition-colors">
            <Users size={20} />
            <span className="font-medium">Clients</span>
          </Link>
          <Link href="/job-sites" className="flex items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors">
            <MapPin size={20} />
            <span className="font-medium">Job Sites</span>
          </Link>
          <Link href="/quotes" className="flex items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors">
            <FileText size={20} />
            <span className="font-medium">Quotes</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button className="flex w-full items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors">
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header (fallback when sidebar is hidden) */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">CRM Artisan</h2>
          <button className="text-zinc-600 dark:text-zinc-400">
             <LayoutDashboard size={24} />
          </button>
        </header>
        
        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}