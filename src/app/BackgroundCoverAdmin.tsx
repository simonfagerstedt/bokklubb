"use client";

import { useState } from "react";
import { ConfirmSubmitForm } from "./ConfirmSubmitForm";
import { CoverSearchPicker } from "./CoverSearchPicker";

type Cover = { id: string; cover_url: string; title: string | null };

/**
 * Admin panel for the background collage: a grid of the current covers,
 * each replaceable (search Open Library, pick a result) or removable, plus
 * an "add another" form at the end. All three server actions revalidate
 * "/" on success, so a successful change here refreshes the covers this
 * component was passed, straight from the Server Component parent.
 */
export function BackgroundCoverAdmin({
  covers,
  addAction,
  replaceAction,
  deleteAction,
}: {
  covers: Cover[];
  addAction: (formData: FormData) => Promise<void>;
  replaceAction: (coverId: string, formData: FormData) => Promise<void>;
  deleteAction: (coverId: string) => Promise<void>;
}) {
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {covers.map((cover) => (
          <li key={cover.id} className="flex flex-col gap-1">
            <div className="aspect-[2/3] w-full overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.cover_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            {cover.title && (
              <p
                className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400"
                title={cover.title}
              >
                {cover.title}
              </p>
            )}
            {replacingId === cover.id ? (
              <ReplaceCoverForm
                coverId={cover.id}
                currentUrl={cover.cover_url}
                currentTitle={cover.title ?? ""}
                action={replaceAction}
                onDone={() => setReplacingId(null)}
              />
            ) : (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setReplacingId(cover.id)}
                  className="flex-1 rounded border border-zinc-300 px-1.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Replace
                </button>
                <ConfirmSubmitForm
                  action={deleteAction.bind(null, cover.id)}
                  confirmText="Remove this cover from the background?"
                >
                  <button className="rounded border border-zinc-300 px-1.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:hover:bg-red-950">
                    Remove
                  </button>
                </ConfirmSubmitForm>
              </div>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <AddCoverForm action={addAction} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
        >
          Add another cover
        </button>
      )}
    </div>
  );
}

function AddCoverForm({
  action,
  onDone,
}: {
  action: (formData: FormData) => Promise<void>;
  onDone: () => void;
}) {
  const [coverUrl, setCoverUrl] = useState("");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex max-w-sm flex-col gap-2 rounded-lg border border-dashed border-zinc-300 p-3 text-sm dark:border-zinc-700"
      action={async (formData) => {
        setPending(true);
        setError(null);
        try {
          await action(formData);
          setCoverUrl("");
          setTitle("");
          onDone();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <CoverSearchPicker
        autoFocus
        onPick={(picked) => {
          setCoverUrl(picked.url);
          setTitle(picked.title);
        }}
      />
      <input
        name="cover_url"
        value={coverUrl}
        onChange={(e) => setCoverUrl(e.target.value)}
        placeholder="Cover image URL — or paste your own"
        className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Caption (optional)"
        className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          className="h-24 w-16 self-start rounded object-cover"
        />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={!coverUrl.trim() || pending}
          className="rounded bg-black px-3 py-1.5 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Adding…" : "Add cover"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ReplaceCoverForm({
  coverId,
  currentUrl,
  currentTitle,
  action,
  onDone,
}: {
  coverId: string;
  currentUrl: string;
  currentTitle: string;
  action: (coverId: string, formData: FormData) => Promise<void>;
  onDone: () => void;
}) {
  const [coverUrl, setCoverUrl] = useState(currentUrl);
  const [title, setTitle] = useState(currentTitle);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-1"
      action={async (formData) => {
        setPending(true);
        setError(null);
        try {
          await action(coverId, formData);
          onDone();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
          setPending(false);
        }
      }}
    >
      <CoverSearchPicker
        autoFocus
        onPick={(picked) => {
          setCoverUrl(picked.url);
          setTitle(picked.title);
        }}
      />
      <input
        name="cover_url"
        value={coverUrl}
        onChange={(e) => setCoverUrl(e.target.value)}
        placeholder="Cover image URL — or paste your own"
        className="rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Caption (optional)"
        className="rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-1">
        <button
          disabled={!coverUrl.trim() || pending}
          className="flex-1 rounded bg-black px-1.5 py-1 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded border border-zinc-300 px-1.5 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
