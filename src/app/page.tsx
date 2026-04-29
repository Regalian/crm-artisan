import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  let connectionValid = false;
  try {
    const timeQuery = await supabase.auth.getSession();
    connectionValid = !timeQuery.error;
  } catch(e) {
    connectionValid = false;
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="flex flex-col items-center text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-black dark:text-white">
          CRM Artisan
        </h1>
        <p className="mt-4 text-xl text-zinc-600 dark:text-zinc-400">
          Coming Soon
        </p>
        <p className="mt-8 text-sm text-zinc-500">
          Supabase Connection: {connectionValid ? "Success" : "Failed"}
        </p>
      </main>
    </div>
  );
}
