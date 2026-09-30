"use client";

import { Fragment, useActionState } from "react";
import { BookSearchFields } from "./BookSearchFields";
import { FinishedAtField } from "./FinishedAtField";

type State = { resetKey: number; error: string | null };

const initialState: State = { resetKey: 0, error: null };

/**
 * The "add a book you've already read" form — same clear-after-success
 * behavior as SuggestBookForm (see its comment): resetKey remounts the
 * fields on a successful add, and a failed add keeps what was typed and
 * shows the error instead.
 */
export function AddReadBookForm({
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
    <form action={formAction} className="mt-3 grid grid-cols-2 gap-2 text-sm">
      <Fragment key={state.resetKey}>
        <BookSearchFields idPrefix="read" />
        <FinishedAtField />
      </Fragment>
      {state.error && (
        <p className="col-span-2 text-xs text-red-500">{state.error}</p>
      )}
      <div className="col-span-2">
        <button
          disabled={pending}
          className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Adding…" : "Add book"}
        </button>
      </div>
    </form>
  );
}
