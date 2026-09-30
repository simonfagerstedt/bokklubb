import { createClient } from "@/lib/supabase/server";
import {
  addSuggestion,
  addReview,
  deleteReview,
  toggleVote,
  markAsCurrent,
  finishCurrentBook,
  updateBookDetails,
  addReadBook,
  hideSuggestion,
  unhideSuggestion,
  deleteBook,
  signOut,
} from "./actions";
import { ConfirmSubmitForm } from "./ConfirmSubmitForm";

type Member = { id: string; display_name: string | null; is_admin: boolean };
type Review = {
  id: string;
  rating: number;
  body: string | null;
  member_id: string;
};
// A mix of classics and modern reads, faded into a background collage —
// not tied to what the club is actually reading.
const BACKGROUND_COVERS = [
  "https://covers.openlibrary.org/b/id/8467127-L.jpg", // Pride and Prejudice
  "https://covers.openlibrary.org/b/id/12927145-L.jpg", // Circe
  "https://covers.openlibrary.org/b/id/106239-L.jpg", // Moby-Dick
  "https://covers.openlibrary.org/b/id/12816990-L.jpg", // Tomorrow, and Tomorrow, and Tomorrow
  "https://covers.openlibrary.org/b/id/10616570-L.jpg", // Nineteen Eighty-Four
  "https://covers.openlibrary.org/b/id/9158360-L.jpg", // Normal People
  "https://covers.openlibrary.org/b/id/12622046-L.jpg", // Crime and Punishment
  "https://covers.openlibrary.org/b/id/15208263-L.jpg", // Project Hail Mary
  "https://covers.openlibrary.org/b/id/15098734-L.jpg", // Jane Eyre
  "https://covers.openlibrary.org/b/id/12866714-L.jpg", // Babel
  "https://covers.openlibrary.org/b/id/2325007-L.jpg", // Frankenstein
  "https://covers.openlibrary.org/b/id/15212562-L.jpg", // The Overstory
  "https://covers.openlibrary.org/b/id/8236262-L.jpg", // Anna Karenina
  "https://covers.openlibrary.org/b/id/12446638-L.jpg", // The Song of Achilles
  "https://covers.openlibrary.org/b/id/8238786-L.jpg", // The Great Gatsby
  "https://covers.openlibrary.org/b/id/13011435-L.jpg", // Piranesi
  "https://covers.openlibrary.org/b/id/13496213-L.jpg", // Wuthering Heights
  "https://covers.openlibrary.org/b/id/8815122-L.jpg", // Educated
  "https://covers.openlibrary.org/b/id/12622155-L.jpg", // Dracula
  "https://covers.openlibrary.org/b/id/6533183-L.jpg", // Älskaren (L'Amant)
  "https://covers.openlibrary.org/b/id/10871487-L.jpg", // Klara and the Sun
];

type Book = {
  id: string;
  title: string;
  author: string;
  status: "suggested" | "current" | "read" | "hidden";
  pitch: string | null;
  cover_url: string | null;
  description: string | null;
  original_title: string | null;
  published_year: number | null;
  added_by: string | null;
  finished_at: string | null;
  created_at: string;
};

function BookCoverBackground() {
  // Tile the cover list into a fixed, full-viewport grid behind everything,
  // faded and desaturated so it reads as texture rather than content.
  const tiles = Array.from(
    { length: 30 },
    (_, i) => BACKGROUND_COVERS[i % BACKGROUND_COVERS.length],
  );

  return (
    <div className="fixed inset-0 -z-10 bg-zinc-50 dark:bg-black" aria-hidden="true">
      <div className="grid h-full w-full grid-cols-3 gap-1 opacity-25 grayscale sm:grid-cols-5 lg:grid-cols-6 dark:opacity-20">
        {tiles.map((url, i) => (
          <div key={i} className="aspect-[2/3] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function BookEditForm({ book }: { book: Book }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-900">
      <form
        id={`edit-book-${book.id}`}
        action={updateBookDetails.bind(null, book.id)}
        className="col-span-2 grid grid-cols-2 gap-2"
      >
        <input
          name="title"
          defaultValue={book.title}
          placeholder="Title"
          required
          className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-1"
        />
        <input
          name="author"
          defaultValue={book.author}
          placeholder="Author"
          required
          className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-1"
        />
        <input
          name="cover_url"
          defaultValue={book.cover_url ?? ""}
          placeholder="Cover image URL"
          className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          name="original_title"
          defaultValue={book.original_title ?? ""}
          placeholder="Original title (optional)"
          className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-1"
        />
        <input
          name="published_year"
          type="number"
          defaultValue={book.published_year ?? ""}
          placeholder="Year"
          className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-1"
        />
        <textarea
          name="description"
          defaultValue={book.description ?? ""}
          placeholder="Description"
          rows={2}
          className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {book.status === "read" && (
          <label className="col-span-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:col-span-1">
            Finished on
            <input
              name="finished_at"
              type="date"
              defaultValue={
                book.finished_at
                  ? new Date(book.finished_at).toISOString().slice(0, 10)
                  : ""
              }
              className="flex-1 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        )}
      </form>
      <div className="col-span-2 flex items-center gap-2">
        <button
          form={`edit-book-${book.id}`}
          className="rounded bg-black px-3 py-1.5 text-white dark:bg-white dark:text-black"
        >
          Save changes
        </button>
        <ConfirmSubmitForm
          action={deleteBook.bind(null, book.id)}
          confirmText={`Delete "${book.title}"? This can't be undone.`}
        >
          <button className="rounded border border-red-300 px-3 py-1.5 text-red-600 dark:border-red-900 dark:text-red-400">
            Delete book
          </button>
        </ConfirmSubmitForm>
      </div>
    </div>
  );
}

function AdminLockedButton({ label }: { label: string }) {
  return (
    <button
      disabled
      title="Admins only"
      className="cursor-not-allowed rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
    >
      🔒 {label}
    </button>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-zinc-300 dark:text-zinc-700">
        {"★".repeat(5 - rating)}
      </span>
    </span>
  );
}

export default async function Home() {
  const supabase = await createClient();

  const [
    { data: userData },
    { data: books },
    { data: members },
    { data: reviews },
    { data: votes },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("books")
      .select(
        "id, title, author, status, pitch, cover_url, description, original_title, published_year, added_by, finished_at, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("members").select("id, display_name, is_admin"),
    supabase
      .from("reviews")
      .select("id, book_id, rating, body, member_id")
      .order("created_at", { ascending: false }),
    supabase.from("suggestion_votes").select("book_id, member_id"),
  ]);

  const user = userData.user;
  const membersById = new Map<string, Member>(
    (members ?? []).map((m) => [m.id, m]),
  );
  const me = user ? membersById.get(user.id) : undefined;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    me?.display_name ??
    user?.email;
  const isAdmin = me?.is_admin ?? false;

  const allBooks = (books ?? []) as Book[];
  const current = allBooks.find((b) => b.status === "current");
  const suggested = allBooks.filter((b) => b.status === "suggested");
  const hiddenSuggestions = allBooks.filter((b) => b.status === "hidden");
  const read = allBooks
    .filter((b) => b.status === "read")
    .sort(
      (a, b) =>
        new Date(b.finished_at ?? b.created_at).getTime() -
        new Date(a.finished_at ?? a.created_at).getTime(),
    );

  const reviewsByBook = new Map<string, Review[]>();
  for (const r of reviews ?? []) {
    const list = reviewsByBook.get(r.book_id) ?? [];
    list.push(r);
    reviewsByBook.set(r.book_id, list);
  }

  const votesByBook = new Map<string, string[]>();
  for (const v of votes ?? []) {
    const list = votesByBook.get(v.book_id) ?? [];
    list.push(v.member_id);
    votesByBook.set(v.book_id, list);
  }

  function avgRating(bookId: string) {
    const list = reviewsByBook.get(bookId) ?? [];
    if (list.length === 0) return null;
    return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
  }

  return (
    <div className="relative min-h-screen font-sans">
      <BookCoverBackground />

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            📚 Bokcirkeln
          </span>
          {user ? (
            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <span>Välkommen {displayName}!</span>
              <a href="/account/password" className="underline underline-offset-2">
                Set or change password
              </a>
              <form action={signOut}>
                <button className="underline underline-offset-2">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <a
              href="/login"
              className="text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
            >
              Sign in
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-10">
        {/* Currently reading */}
        <section>
          <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Currently reading
          </h2>
          {current ? (
            <div className="flex gap-5 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              {current.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.cover_url}
                  alt={`Cover of ${current.title}`}
                  className="h-40 w-28 shrink-0 rounded object-cover shadow-sm"
                />
              )}
              <div className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {current.title}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {current.author}
                {current.original_title && current.published_year && (
                  <>
                    {" "}
                    — {current.original_title}, {current.published_year}
                  </>
                )}
              </p>
              {current.description && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {current.description}
                </p>
              )}

              {user && (
                <div className="mt-4">
                  {isAdmin ? (
                    <form action={finishCurrentBook.bind(null, current.id)}>
                      <button className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                        Mark as finished
                      </button>
                    </form>
                  ) : (
                    <AdminLockedButton label="Mark as finished" />
                  )}
                </div>
              )}

              {isAdmin && (
                <details className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                  <summary className="cursor-pointer text-sm text-zinc-500 dark:text-zinc-400">
                    Edit book details
                  </summary>
                  <BookEditForm book={current} />
                </details>
              )}

              {user && (() => {
                const myReview = (reviewsByBook.get(current.id) ?? []).find(
                  (r) => r.member_id === user.id,
                );
                return (
                  <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-900">
                    <label className="text-sm text-zinc-600 dark:text-zinc-400">
                      Your take so far
                    </label>
                    <div className="flex items-center gap-2">
                      <form
                        action={addReview.bind(null, current.id)}
                        className="flex flex-1 items-center gap-2"
                      >
                        <select
                          name="rating"
                          defaultValue={myReview?.rating ?? ""}
                          className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          <option value="" disabled>
                            Rate
                          </option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n} ★
                            </option>
                          ))}
                        </select>
                        <input
                          name="body"
                          defaultValue={myReview?.body ?? ""}
                          placeholder="Short review (optional)"
                          className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <button className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black">
                          Save
                        </button>
                      </form>
                      {myReview && (
                        <ConfirmSubmitForm
                          action={deleteReview.bind(null, current.id)}
                          confirmText="Delete your review of this book?"
                        >
                          <button className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 dark:border-red-900 dark:text-red-400">
                            Delete
                          </button>
                        </ConfirmSubmitForm>
                      )}
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Nobody&apos;s reading anything right now — promote a suggestion
              below.
            </p>
          )}
        </section>

        {/* Suggestions */}
        <section>
          <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Suggestions for next book
          </h2>

          <ul className="flex flex-col gap-2">
            {suggested
              .slice()
              .sort(
                (a, b) =>
                  (votesByBook.get(b.id)?.length ?? 0) -
                  (votesByBook.get(a.id)?.length ?? 0),
              )
              .map((book) => {
                const voteCount = votesByBook.get(book.id)?.length ?? 0;
                const iVoted = user
                  ? (votesByBook.get(book.id) ?? []).includes(user.id)
                  : false;
                const suggestedBy = book.added_by
                  ? membersById.get(book.added_by)?.display_name
                  : null;

                return (
                  <li
                    key={book.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {book.title}{" "}
                        <span className="font-normal text-zinc-500 dark:text-zinc-400">
                          — {book.author}
                        </span>
                      </p>
                      {book.pitch && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {book.pitch}
                        </p>
                      )}
                      {suggestedBy && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          suggested by {suggestedBy}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {user ? (
                        <form action={toggleVote.bind(null, book.id)}>
                          <button
                            className={`rounded border px-2 py-1 text-sm ${
                              iVoted
                                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                                : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            ▲ {voteCount}
                          </button>
                        </form>
                      ) : (
                        <span className="text-sm text-zinc-400">
                          ▲ {voteCount}
                        </span>
                      )}
                      {!current &&
                        (isAdmin ? (
                          <form action={markAsCurrent.bind(null, book.id)}>
                            <button className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                              Start reading
                            </button>
                          </form>
                        ) : (
                          user && <AdminLockedButton label="Start reading" />
                        ))}
                      {isAdmin && (
                        <ConfirmSubmitForm
                          action={hideSuggestion.bind(null, book.id)}
                          confirmText={`Hide "${book.title}" from suggestions? You can bring it back later from Hidden suggestions.`}
                        >
                          <button className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                            Hide
                          </button>
                        </ConfirmSubmitForm>
                      )}
                      {isAdmin && (
                        <ConfirmSubmitForm
                          action={deleteBook.bind(null, book.id)}
                          confirmText={`Delete "${book.title}"? This can't be undone.`}
                        >
                          <button className="rounded border border-red-300 px-2 py-1 text-sm text-red-600 dark:border-red-900 dark:text-red-400">
                            Delete
                          </button>
                        </ConfirmSubmitForm>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>

          {user ? (
            <form
              action={addSuggestion}
              className="mt-3 flex flex-col gap-2 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700"
            >
              <div className="flex gap-2">
                <input
                  name="title"
                  placeholder="Title"
                  required
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <input
                  name="author"
                  placeholder="Author"
                  required
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <input
                name="pitch"
                placeholder="Why should we read it? (optional)"
                className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button className="self-start rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black">
                Suggest a book
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              <a href="/login" className="underline">
                Sign in
              </a>{" "}
              to suggest a book or vote.
            </p>
          )}

          {hiddenSuggestions.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-zinc-500 dark:text-zinc-400">
                Hidden suggestions ({hiddenSuggestions.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-2">
                {hiddenSuggestions.map((book) => (
                  <li
                    key={book.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {book.title}{" "}
                        <span className="font-normal text-zinc-500 dark:text-zinc-400">
                          — {book.author}
                        </span>
                      </p>
                      {book.pitch && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {book.pitch}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex shrink-0 items-center gap-2">
                        <form action={unhideSuggestion.bind(null, book.id)}>
                          <button className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                            Unhide
                          </button>
                        </form>
                        <ConfirmSubmitForm
                          action={deleteBook.bind(null, book.id)}
                          confirmText={`Delete "${book.title}"? This can't be undone.`}
                        >
                          <button className="rounded border border-red-300 px-2 py-1 text-sm text-red-600 dark:border-red-900 dark:text-red-400">
                            Delete
                          </button>
                        </ConfirmSubmitForm>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {/* Books read */}
        <section>
          <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Books read
          </h2>

          {read.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing finished yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {read.map((book) => {
                const bookReviews = reviewsByBook.get(book.id) ?? [];
                const avg = avgRating(book.id);

                return (
                  <li
                    key={book.id}
                    className="flex gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    {book.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.cover_url}
                        alt={`Cover of ${book.title}`}
                        className="h-24 w-16 shrink-0 rounded object-cover shadow-sm"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {book.title}{" "}
                          <span className="font-normal text-zinc-500 dark:text-zinc-400">
                            — {book.author}
                          </span>
                        </p>
                        {avg !== null && (
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {avg.toFixed(1)} ★ ({bookReviews.length})
                          </span>
                        )}
                      </div>
                      {book.finished_at && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          finished{" "}
                          {new Date(book.finished_at).toISOString().slice(0, 10)}
                        </p>
                      )}

                      {bookReviews.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-900">
                          {bookReviews.map((r) => (
                            <li key={r.id} className="text-sm">
                              <Stars rating={r.rating} />{" "}
                              <span className="text-zinc-600 dark:text-zinc-400">
                                {membersById.get(r.member_id)?.display_name ??
                                  "member"}
                                {r.body ? ` — ${r.body}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {user && (() => {
                        const myReview = bookReviews.find(
                          (r) => r.member_id === user.id,
                        );
                        return (
                          <div className="mt-2 flex items-center gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-900">
                            <form
                              action={addReview.bind(null, book.id)}
                              className="flex flex-1 items-center gap-2"
                            >
                              <select
                                name="rating"
                                defaultValue={myReview?.rating ?? ""}
                                required
                                className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                              >
                                <option value="" disabled>
                                  Rate
                                </option>
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <option key={n} value={n}>
                                    {n} ★
                                  </option>
                                ))}
                              </select>
                              <input
                                name="body"
                                defaultValue={myReview?.body ?? ""}
                                placeholder={myReview ? "Edit your review" : "Add your review"}
                                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                              />
                              <button className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black">
                                Save
                              </button>
                            </form>
                            {myReview && (
                              <ConfirmSubmitForm
                                action={deleteReview.bind(null, book.id)}
                                confirmText="Delete your review of this book?"
                              >
                                <button className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 dark:border-red-900 dark:text-red-400">
                                  Delete
                                </button>
                              </ConfirmSubmitForm>
                            )}
                          </div>
                        );
                      })()}

                      {isAdmin && (
                        <details className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-900">
                          <summary className="cursor-pointer text-xs text-zinc-500 dark:text-zinc-400">
                            Edit
                          </summary>
                          <BookEditForm book={book} />
                        </details>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {isAdmin && (
            <details className="mt-3 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
              <summary className="cursor-pointer text-sm text-zinc-500 dark:text-zinc-400">
                Add a book you&apos;ve already read
              </summary>
              <form
                action={addReadBook}
                className="mt-3 grid grid-cols-2 gap-2 text-sm"
              >
                <input
                  name="title"
                  placeholder="Title"
                  required
                  className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-1"
                />
                <input
                  name="author"
                  placeholder="Author"
                  required
                  className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-1"
                />
                <input
                  name="cover_url"
                  placeholder="Cover image URL"
                  className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <input
                  name="original_title"
                  placeholder="Original title (optional)"
                  className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-1"
                />
                <input
                  name="published_year"
                  type="number"
                  placeholder="Year"
                  className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-1"
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  rows={2}
                  className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <label className="col-span-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:col-span-1">
                  Finished on
                  <input
                    name="finished_at"
                    type="date"
                    className="flex-1 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <div className="col-span-2">
                  <button className="rounded bg-black px-3 py-1.5 text-white dark:bg-white dark:text-black">
                    Add book
                  </button>
                </div>
              </form>
            </details>
          )}
        </section>

        {/* Members */}
        <section>
          <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Members
          </h2>
          {members && members.some((m) => m.display_name?.trim()) ? (
            <ul className="flex flex-wrap gap-2">
              {members
                .filter((m) => m.display_name?.trim())
                .map((m) => (
                  <li
                    key={m.id}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                  >
                    {m.display_name}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">
              Nobody&apos;s signed in yet —{" "}
              <a href="/login" className="underline">
                be the first
              </a>
              .
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
