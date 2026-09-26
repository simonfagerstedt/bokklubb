"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function sendMagicLink() {
    if (!email) {
      setStatus("error");
      setErrorMsg("Enter your email address first.");
      return;
    }
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {status === "sent" ? (
        <p className="text-sm text-neutral-500">
          Check {email} for a sign-in link.
        </p>
      ) : (
        <form onSubmit={signInWithPassword} className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password (if you've set one)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          />
          <button
            type="submit"
            disabled={!password}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Sign in with password
          </button>

          <div className="text-center text-xs text-neutral-400">or</div>

          <button
            type="button"
            onClick={sendMagicLink}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          >
            Send magic link
          </button>

          {status === "error" && <p className="text-sm text-red-500">{errorMsg}</p>}
        </form>
      )}
    </main>
  );
}
