import { redirect } from "next/navigation";

import { BottomNav, DesktopSidebar, MobileAccountBar } from "@/app/components/Navigation";
import { createClient } from "@/utils/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <DesktopSidebar user={user} />

      <main className="flex min-h-screen flex-1 flex-col pb-28 md:pb-0">
        <MobileAccountBar user={user} />
        <div className="flex-1 min-w-0">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}
