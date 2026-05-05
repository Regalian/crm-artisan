import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DesktopSidebar, MobileNav } from "./components/Navigation";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900 font-sans text-zinc-900 dark:text-white">
        
        <DesktopSidebar />

        <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          <MobileNav />
          
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
