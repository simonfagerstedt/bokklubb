"use client";

import { Fragment, useActionState } from "react";
import { BookSearchFields } from "./BookSearchFields";

type State = { resetKey: number; error: string | null };

const initialState: State = { resetKey: 0, error: null };

/**
 * The "suggest a book" form. A plain `<form action={addSuggestion}>`
 * wouldn't clear itself after a successful submit: BookSearchFields keeps
 * its values in React state (for the search-and-pick UX), and that state
 * doesn't reset just because the underlying <input> elements would.
 *
 * `resetKey` bumps on success, remounting the fields fresh via the keyed
 * Fragment below. On failure (a thrown error from the server action) the
 * key stays put — nothing typed is lost — and the message is shown
 * instead. `action` is a Server Action reference, which is fine to pass
 * as a prop from a Server Component; a plain function wouldn't be.
 */
export function SuggestBookForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (prevState, formData) => {
      try {
        await action(formData);
        return { resetKey: prevState.resetKey + 1, error: null };
      } catch (err) {
        return {
          resetKey: prevState.resetKey,
          error: err instanceof Error ? err.message : "Something went wrong.",
        };
      }
    },
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700"
    >
      <Fragment key={state.resetKey}>
        <BookSearchFields idPrefix="suggest" />
        <input
          name="pitch"
          placeholder="Why should we read it? (optional)"
          className="col-span-2 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Fragment>
      {state.error && (
        <p className="col-span-2 text-xs text-red-500">{state.error}</p>
      )}
      <button
        disabled={pending}
        className="col-span-2 self-start rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Suggesting…" : "Suggest a book"}
      </button>
    </form>
  );
}
