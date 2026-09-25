import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Next.js + Supabase + Cloudflare
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as: {user ? user.email : "nobody"} —{" "}
          <a href="/login" className="underline">
            sign in
          </a>
        </p>

        <div>
          <h2 className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">
            Notes from Supabase
          </h2>
          {error ? (
            <p className="text-sm text-red-500">
              Couldn&apos;t reach Supabase yet: {error.message}. Fill in{" "}
              <code>.env.local</code> and run the migration in{" "}
              <code>supabase/migrations</code> — see SETUP.md.
            </p>
          ) : notes && notes.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              {notes.map((note) => (
                <li key={note.id}>{note.title}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">
              Connected, but the <code>notes</code> table is empty. Insert a
              row from the Supabase dashboard to see it here.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
