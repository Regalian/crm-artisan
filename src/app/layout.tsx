import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DesktopSidebar, MobileNav } from "./components/Navigation";
import { createClient } from "@/utils/supabase/server";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // No session → auth page, render just the page content (no sidebar/nav)
  if (!user) {
    return (
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <body className="min-h-screen bg-zinc-50 dark:bg-zinc-900 font-sans text-zinc-900 dark:text-white">
          {children}
        </body>
      </html>
    );
  }

  // Logged in → full app layout with sidebar and navigation
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900 font-sans text-zinc-900 dark:text-white">
        <DesktopSidebar user={user} />

        <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          <MobileNav user={user} />
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
