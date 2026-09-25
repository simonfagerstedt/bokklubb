"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {status === "sent" ? (
        <p className="text-sm text-neutral-500">
          Check {email} for a sign-in link.
        </p>
      ) : (
        <form onSubmit={sendMagicLink} className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          />
          <button
            type="submit"
            className="rounded bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
          >
            Send magic link
          </button>
          {status === "error" && (
            <p className="text-sm text-red-500">
              Something went wrong. Check your Supabase env vars and try again.
            </p>
          )}
        </form>
      )}
    </main>
  );
}
