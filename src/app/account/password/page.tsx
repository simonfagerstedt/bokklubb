"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("done");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Set a password</h1>

      {status === "done" ? (
        <p className="text-sm text-green-600">
          Password set — you can now sign in with email and password.{" "}
          <Link href="/" className="underline">
            Back to start
          </Link>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          />
          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
          >
            {status === "saving" ? "Saving…" : "Set password"}
          </button>
          {status === "error" && <p className="text-sm text-red-500">{errorMsg}</p>}
        </form>
      )}
    </main>
  );
}
