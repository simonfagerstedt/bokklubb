// TypeScript cannot resolve the JSX runtime in this environment; Next.js resolves it at build time.
// @ts-nocheck
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Next.js + Supabase + Cloudflare
        </h1>

        {user ? (
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Välkommen {displayName}!
          </p>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Not signed in —{" "}
            <a href="/login" className="underline">
              sign in
            </a>
          </p>
        )}
      </main>
    </div>
  );
}
