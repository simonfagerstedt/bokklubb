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
  addBackgroundCover,
  replaceBackgroundCover,
  deleteBackgroundCover,
  reorderBackgroundCovers,
  updateBackgroundSettings,
  signOut,
  suggestMeetupDate,
  toggleMeetupVote,
  deleteMeetupDate,
  finishMeetupVote,
  resetMeetupDates,
} from "./actions";
import { ConfirmSubmitForm } from "./ConfirmSubmitForm";
import { AddReadBookForm } from "./AddReadBookForm";
import { BackgroundCoverAdmin } from "./BackgroundCoverAdmin";
import { BackgroundSettingsForm } from "./BackgroundSettingsForm";
import { FinishedAtField } from "./FinishedAtField";
import { SuggestBookForm } from "./SuggestBookForm";
import { club } from "@/club";
import {
  formatMeetDate,
  leadingDates,
  todayInSweden,
  votersByDate,
  type MeetupDate,
  type MeetupDateVote,
} from "@/lib/meetup";

type Member = { id: string; display_name: string | null; is_admin: boolean };
type BackgroundCover = { id: string; cover_url: string; title: string | null };
type BackgroundSettings = {
  colsMobile: number;
  colsTablet: number;
  colsDesktop: number;
  gapXPercent: number;
  gapYPercent: number;
  grayscale: boolean;
};
type Review = {
  id: string;
  rating: number;
  body: string | null;
  member_id: string;
};
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
  /** The meetup date ("YYYY-MM-DD"), set on the current item. */
  meet_on: string | null;
  created_at: string;
};

function BookCoverBackground({
  covers,
  settings,
}: {
  covers: string[];
  settings: BackgroundSettings;
}) {
  // Tile the cover list into a fixed, full-viewport grid behind everything,
  // faded and desaturated so it reads as texture rather than content. The
  // tile count scales with how many covers actually exist (so adding covers
  // is visible), rounded up to a multiple of colsDesktop so the last row is
  // always full at the most-viewed (desktop) breakpoint. Capped well below
  // what it costs to server-render each request — a Worker only gets a
  // short CPU budget per request, and a previous, uncapped version of this
  // (chasing a multiple of all three breakpoints' column counts at once,
  // with no sane ceiling) rendered well over a hundred tiles and blew that
  // budget, returning Cloudflare error 1102 ("exceeded resource limits").
  // Falls back to the club's built-in collage if the background_covers
  // table is empty (e.g. an admin removed everything); a club without one
  // gets a plain background.
  const source = covers.length > 0 ? covers : club.fallbackBackgroundCovers;
  if (source.length === 0) {
    return (
      <div className="fixed inset-0 -z-10 bg-zinc-50 dark:bg-black" aria-hidden="true" />
    );
  }
  const { colsMobile, colsTablet, colsDesktop, gapXPercent, gapYPercent, grayscale } =
    settings;
  const MAX_TILES = 60;
  // The largest multiple of colsDesktop that still fits under MAX_TILES,
  // so the cap itself never breaks the "full last row" guarantee.
  const tileCap = Math.max(
    colsDesktop,
    Math.floor(MAX_TILES / colsDesktop) * colsDesktop,
  );
  const tileCount = Math.min(
    tileCap,
    Math.ceil(Math.max(source.length, 24) / colsDesktop) * colsDesktop,
  );
  const tiles = Array.from(
    { length: tileCount },
    (_, i) => source[i % source.length],
  );

  // Column counts and the gaps come from background_settings (admin-editable
  // in the "Background images" panel), so they can't be plain Tailwind
  // classes — Tailwind only generates CSS for class names it can see
  // literally in the source, not ones built from a runtime/database value.
  // A small scoped <style> block does the same job (one breakpoint per
  // media query) without needing a stylesheet build step. Each gap is
  // stored as "% of a tile's own width/height". For an N-column grid, tile
  // width is ~(100/N)vw, so the horizontal gap is (gapXPercent / N)vw; tiles
  // are aspect-[2/3] (height = 1.5x width), so the vertical gap works out to
  // (gapYPercent * 1.5 / N)vw to stay in the same vw-based unit system.
  return (
    <div className="fixed inset-0 -z-10 bg-zinc-50 dark:bg-black" aria-hidden="true">
      <style>{`
        .book-cover-collage {
          grid-template-columns: repeat(${colsMobile}, minmax(0, 1fr));
          column-gap: ${gapXPercent / colsMobile}vw;
          row-gap: ${(gapYPercent * 1.5) / colsMobile}vw;
        }
        @media (min-width: 640px) {
          .book-cover-collage {
            grid-template-columns: repeat(${colsTablet}, minmax(0, 1fr));
            column-gap: ${gapXPercent / colsTablet}vw;
            row-gap: ${(gapYPercent * 1.5) / colsTablet}vw;
          }
        }
        @media (min-width: 1024px) {
          .book-cover-collage {
            grid-template-columns: repeat(${colsDesktop}, minmax(0, 1fr));
            column-gap: ${gapXPercent / colsDesktop}vw;
            row-gap: ${(gapYPercent * 1.5) / colsDesktop}vw;
          }
        }
      `}</style>
      <div
        className={`book-cover-collage grid h-full w-full ${
          grayscale
            ? "opacity-25 grayscale dark:opacity-20"
            : "opacity-10 dark:opacity-10"
        }`}
      >
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
          placeholder={club.text.creatorLabel}
          required
          className="col-span-2 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-1"
        />
        <input
          name="cover_url"
          defaultValue={book.cover_url ?? ""}
          placeholder={club.text.coverUrlPlaceholder}
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
        {book.status === "current" && (
          <label className="col-span-2 flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            Meetup date
            <input
              name="meet_on"
              type="date"
              defaultValue={book.meet_on ?? ""}
              className="min-w-0 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        )}
        {book.status === "read" && (
          <FinishedAtField
            defaultValue={
              book.finished_at
                ? new Date(book.finished_at).toISOString().slice(0, 10)
                : ""
            }
          />
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
            {club.text.deleteItem}
          </button>
        </ConfirmSubmitForm>
      </div>
    </div>
  );
}

function BookDescription({ description }: { description: string | null }) {
  if (!description) return null;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
        Description
      </summary>
      <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </details>
  );
}

function BookMeta({
  originalTitle,
  publishedYear,
}: {
  originalTitle: string | null;
  publishedYear: number | null;
}) {
  if (!originalTitle && !publishedYear) return null;
  return (
    <span className="text-zinc-400 dark:text-zinc-500">
      {" "}
      ({originalTitle}
      {originalTitle && publishedYear && ", "}
      {publishedYear})
    </span>
  );
}

/**
 * An admin button that also settles the meetup date poll. With a clear
 * leader (or no poll) it's a plain button; on a tie it opens a small menu
 * of the leading dates, and the admin's pick is sent as "meet_on".
 */
function MeetDateChoiceButton({
  action,
  leaders,
  label,
  className,
  menuAlign,
}: {
  action: (formData: FormData) => void;
  leaders: string[];
  label: string;
  className: string;
  /** Which edge of the button the tie menu lines up with. */
  menuAlign: "left" | "right";
}) {
  if (leaders.length <= 1) {
    return (
      <form action={action}>
        {leaders[0] && <input type="hidden" name="meet_on" value={leaders[0]} />}
        <button className={className}>{label}</button>
      </form>
    );
  }
  return (
    <details className="relative">
      <summary
        className={`${className} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
      >
        {label} ▾
      </summary>
      <div
        className={`absolute ${menuAlign === "left" ? "left-0" : "right-0"} z-10 mt-1 flex w-max flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950`}
      >
        <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">
          Tied. Which date?
        </p>
        {leaders.map((d) => (
          <form key={d} action={action}>
            <input type="hidden" name="meet_on" value={d} />
            <button className="w-full rounded px-2 py-1 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900">
              📅 {formatMeetDate(d, true)}
            </button>
          </form>
        ))}
      </div>
    </details>
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
    <span className="text-amber-500" aria-label={`${rating} out of ${club.maxRating} stars`}>
      {"★".repeat(rating)}
      <span className="text-zinc-300 dark:text-zinc-700">
        {"★".repeat(Math.max(0, club.maxRating - rating))}
      </span>
    </span>
  );
}

// Finished books/movies are shown one page of 10 at a time (?page=N).
// Rendering more at once (each with its reviews and rating form) is what
// pushes the page past the Workers free plan's 10 ms CPU budget (error
// 1102), so a page never renders more than this many, however long the
// club's history gets.
const FINISHED_PAGE_SIZE = 10;

// The grades a review can give, 1 to club.maxRating.
const RATINGS = Array.from({ length: club.maxRating }, (_, i) => i + 1);

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const requestedPage = Math.max(
    1,
    Number.parseInt(typeof params.page === "string" ? params.page : "", 10) ||
      1,
  );
  // Admin-only forms (a book's edit form, the background images panel) are
  // only rendered when opened through ?edit=<id> / ?background=1, not for
  // every item on every load: rendering them all is what pushed the admin
  // view past the Workers free plan's CPU budget (error 1102).
  const editId = typeof params.edit === "string" ? params.edit : null;
  const showBackground = params.background === "1";
  function pageHref(
    opts: { edit?: string; background?: boolean; page?: number },
    anchor: string,
  ) {
    const q = new URLSearchParams();
    const page = opts.page ?? finishedPage;
    if (page > 1) q.set("page", String(page));
    if (opts.edit) q.set("edit", opts.edit);
    if (opts.background) q.set("background", "1");
    const qs = q.toString();
    return `/${qs ? `?${qs}` : ""}#${anchor}`;
  }
  const supabase = await createClient();

  const [
    { data: userData },
    { data: books },
    { data: members },
    { data: reviews },
    { data: votes },
    { data: backgroundCovers },
    { data: backgroundSettingsRow },
    { data: meetupDateRows },
    { data: meetupVoteRows },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("books")
      .select(
        "id, title, author, status, pitch, cover_url, description, original_title, published_year, added_by, finished_at, meet_on, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("members").select("id, display_name, is_admin"),
    supabase
      .from("reviews")
      .select("id, book_id, rating, body, member_id")
      .order("created_at", { ascending: false }),
    supabase.from("suggestion_votes").select("book_id, member_id"),
    supabase
      .from("background_covers")
      .select("id, cover_url, title")
      .order("position", { ascending: true }),
    supabase
      .from("background_settings")
      .select(
        "cols_mobile, cols_tablet, cols_desktop, gap_x_percent, gap_y_percent, grayscale",
      )
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("meetup_dates")
      .select("id, meet_on, suggested_by")
      .order("meet_on", { ascending: true }),
    supabase.from("meetup_date_votes").select("meetup_date_id, member_id"),
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

  const covers = (backgroundCovers ?? []) as BackgroundCover[];
  const backgroundSettings: BackgroundSettings = {
    colsMobile: backgroundSettingsRow?.cols_mobile ?? 4,
    colsTablet: backgroundSettingsRow?.cols_tablet ?? 7,
    colsDesktop: backgroundSettingsRow?.cols_desktop ?? 9,
    gapXPercent: backgroundSettingsRow?.gap_x_percent ?? 30,
    gapYPercent: backgroundSettingsRow?.gap_y_percent ?? 30,
    grayscale: backgroundSettingsRow?.grayscale ?? true,
  };

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

  const finishedPages = Math.max(1, Math.ceil(read.length / FINISHED_PAGE_SIZE));
  const finishedPage = Math.min(requestedPage, finishedPages);
  const readOnPage = read.slice(
    (finishedPage - 1) * FINISHED_PAGE_SIZE,
    finishedPage * FINISHED_PAGE_SIZE,
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

  const meetupDates = (meetupDateRows ?? []) as MeetupDate[];
  const meetupVotes = (meetupVoteRows ?? []) as MeetupDateVote[];
  const meetupVoters = votersByDate(meetupVotes);
  const meetupLeaders = leadingDates(meetupDates, meetupVotes);
  const today = todayInSweden();

  function avgRating(bookId: string) {
    const list = reviewsByBook.get(bookId) ?? [];
    if (list.length === 0) return null;
    return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
  }

  return (
    <div className="relative min-h-screen font-sans">
      <BookCoverBackground
        covers={covers.map((c) => c.cover_url)}
        settings={backgroundSettings}
      />

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {`${club.emoji} ${club.name}`}
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
        <section id="current">
          <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            {club.text.currentHeading}
          </h2>
          {current ? (
            <div className="flex gap-5 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              {current.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.cover_url}
                  alt={club.text.coverAlt(current.title)}
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
              {current.meet_on ? (
                <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
                  📅 We meet {formatMeetDate(current.meet_on)}
                </p>
              ) : (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  📅 No meetup date yet.{" "}
                  <a href="#meetup" className="underline underline-offset-2">
                    Suggest one
                  </a>
                </p>
              )}
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
                        {club.text.markFinished}
                      </button>
                    </form>
                  ) : (
                    <AdminLockedButton label={club.text.markFinished} />
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                  {editId === current.id ? (
                    <>
                      <a
                        href={pageHref({}, "current")}
                        className="text-sm text-zinc-500 underline underline-offset-2 dark:text-zinc-400"
                      >
                        Close
                      </a>
                      <BookEditForm book={current} />
                    </>
                  ) : (
                    <a
                      href={pageHref({ edit: current.id }, "current")}
                      className="text-sm text-zinc-500 dark:text-zinc-400"
                    >
                      ▸ {club.text.editDetails}
                    </a>
                  )}
                </div>
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
                      {/* On phones the text gets a full-width line of its own, with
                          the grade, Save and Delete below it; one row from sm up. */}
                      <form
                        action={addReview.bind(null, current.id)}
                        className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                      >
                        <select
                          name="rating"
                          defaultValue={myReview?.rating ?? ""}
                          className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          <option value="" disabled>
                            Rate
                          </option>
                          {RATINGS.map((n) => (
                            <option key={n} value={n}>
                              {n} ★
                            </option>
                          ))}
                        </select>
                        <input
                          name="body"
                          defaultValue={myReview?.body ?? ""}
                          placeholder="Short review (optional)"
                          className="order-first w-full min-w-0 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:order-none sm:w-auto sm:flex-1"
                        />
                        <button className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black">
                          Save
                        </button>
                        {myReview && (
                          <button
                            form={`delete-review-${current.id}`}
                            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 dark:border-red-900 dark:text-red-400"
                          >
                            Delete
                          </button>
                        )}
                      </form>
                      {myReview && (
                        <ConfirmSubmitForm
                          id={`delete-review-${current.id}`}
                          action={deleteReview.bind(null, current.id)}
                          confirmText={club.text.deleteReviewConfirm}
                          className="hidden"
                        />
                      )}
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              {club.text.noCurrent}
            </p>
          )}
        </section>

        {/* Meetup date poll */}
        <section id="meetup">
          <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Next meetup
          </h2>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            {meetupDates.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No dates suggested yet. Suggest a day that works for you, then
                vote for every day you can make.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {meetupDates.map((d) => {
                  const voters = meetupVoters.get(d.id) ?? [];
                  const iVoted = user ? voters.includes(user.id) : false;
                  const leading =
                    voters.length > 0 && meetupLeaders.includes(d.meet_on);
                  const canDelete =
                    isAdmin || (user && d.suggested_by === user.id);
                  return (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 dark:bg-zinc-950"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {formatMeetDate(d.meet_on)}
                          {leading && (
                            <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                              {meetupLeaders.length > 1 ? "tied" : "leading"}
                            </span>
                          )}
                        </p>
                        {voters.length > 0 && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {voters
                              .map((id) => membersById.get(id)?.display_name ?? "?")
                              .join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {user ? (
                          <form action={toggleMeetupVote.bind(null, d.id)}>
                            <button
                              title={iVoted ? "I can't make it after all" : "I can make it"}
                              className={`rounded border px-2 py-1 text-sm ${
                                iVoted
                                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                                  : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                              }`}
                            >
                              ✓ {voters.length}
                            </button>
                          </form>
                        ) : (
                          <span className="text-sm text-zinc-400">
                            ✓ {voters.length}
                          </span>
                        )}
                        {canDelete && (
                          <ConfirmSubmitForm
                            action={deleteMeetupDate.bind(null, d.id)}
                            confirmText={`Remove ${formatMeetDate(d.meet_on)} and its votes?`}
                          >
                            <button
                              title="Remove this date"
                              className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                            >
                              ✕
                            </button>
                          </ConfirmSubmitForm>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {user ? (
              <form
                action={suggestMeetupDate}
                className="mt-3 flex flex-wrap items-center gap-2"
              >
                <input
                  type="date"
                  name="meet_on"
                  min={today}
                  required
                  aria-label="Meetup date"
                  className="min-w-0 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <button className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black">
                  Suggest date
                </button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                <a href="/login" className="underline">
                  Sign in
                </a>{" "}
                to suggest a date or vote.
              </p>
            )}

            {isAdmin && meetupDates.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-amber-200 pt-3 text-sm dark:border-amber-900">
                {current ? (
                  <MeetDateChoiceButton
                    action={finishMeetupVote}
                    leaders={meetupLeaders}
                    label="Finish voting"
                    menuAlign="left"
                    className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                  />
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    The leading date is used when you press “{club.text.startCurrent}”.
                  </p>
                )}
                <ConfirmSubmitForm
                  action={resetMeetupDates}
                  confirmText="Remove all suggested dates and votes?"
                >
                  <button className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm text-red-600 dark:border-red-900 dark:bg-zinc-950 dark:text-red-400">
                    Reset
                  </button>
                </ConfirmSubmitForm>
              </div>
            )}
          </div>
        </section>

        {/* Suggestions */}
        <section>
          <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            {club.text.suggestionsHeading}
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
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {book.cover_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={book.cover_url}
                          alt={club.text.coverAlt(book.title)}
                          className="h-16 w-11 shrink-0 rounded object-cover shadow-sm"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {book.title}{" "}
                          <span className="font-normal text-zinc-500 dark:text-zinc-400">
                            — {book.author}
                          </span>
                          <BookMeta
                            originalTitle={book.original_title}
                            publishedYear={book.published_year}
                          />
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
                        <BookDescription description={book.description} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-auto">
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
                          <MeetDateChoiceButton
                            action={markAsCurrent.bind(null, book.id)}
                            leaders={meetupLeaders}
                            label={club.text.startCurrent}
                            menuAlign="right"
                            className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                          />
                        ) : (
                          user && <AdminLockedButton label={club.text.startCurrent} />
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
            <SuggestBookForm action={addSuggestion} />
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              <a href="/login" className="underline">
                Sign in
              </a>{" "}
              {club.text.signInToSuggest}
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
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {book.title}{" "}
                        <span className="font-normal text-zinc-500 dark:text-zinc-400">
                          — {book.author}
                        </span>
                        <BookMeta
                          originalTitle={book.original_title}
                          publishedYear={book.published_year}
                        />
                      </p>
                      {book.pitch && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {book.pitch}
                        </p>
                      )}
                      <BookDescription description={book.description} />
                    </div>
                    {isAdmin && (
                      <div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-auto">
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
        <section id="finished">
          <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            {club.text.finishedHeading}
          </h2>

          {read.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing finished yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {readOnPage.map((book) => {
                const bookReviews = reviewsByBook.get(book.id) ?? [];
                const avg = avgRating(book.id);

                return (
                  <li
                    key={book.id}
                    id={`item-${book.id}`}
                    className="flex gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    {book.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.cover_url}
                        alt={club.text.coverAlt(book.title)}
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
                          <BookMeta
                            originalTitle={book.original_title}
                            publishedYear={book.published_year}
                          />
                        </p>
                        {avg !== null && (
                          <span className="shrink-0 pl-2 text-sm whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                            {avg.toFixed(1)} ★ ({bookReviews.length})
                          </span>
                        )}
                      </div>
                      {book.finished_at && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {club.text.finishedPrefix}{" "}
                          {new Date(book.finished_at).toISOString().slice(0, 10)}
                        </p>
                      )}
                      <BookDescription description={book.description} />

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
                            {/* On phones the text gets a full-width line of its own, with
                                the grade, Save and Delete below it; one row from sm up. */}
                            <form
                              action={addReview.bind(null, book.id)}
                              className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
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
                                {RATINGS.map((n) => (
                                  <option key={n} value={n}>
                                    {n} ★
                                  </option>
                                ))}
                              </select>
                              <input
                                name="body"
                                defaultValue={myReview?.body ?? ""}
                                placeholder={myReview ? "Edit your review" : "Add your review"}
                                className="order-first w-full min-w-0 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:order-none sm:w-auto sm:flex-1"
                              />
                              <button className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black">
                                Save
                              </button>
                              {myReview && (
                                <button
                                  form={`delete-review-${book.id}`}
                                  className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 dark:border-red-900 dark:text-red-400"
                                >
                                  Delete
                                </button>
                              )}
                            </form>
                            {myReview && (
                              <ConfirmSubmitForm
                                id={`delete-review-${book.id}`}
                                action={deleteReview.bind(null, book.id)}
                                confirmText={club.text.deleteReviewConfirm}
                                className="hidden"
                              />
                            )}
                          </div>
                        );
                      })()}

                      {isAdmin && (
                        <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-900">
                          {editId === book.id ? (
                            <>
                              <a
                                href={pageHref({}, `item-${book.id}`)}
                                className="text-xs text-zinc-500 underline underline-offset-2 dark:text-zinc-400"
                              >
                                Close
                              </a>
                              <BookEditForm book={book} />
                            </>
                          ) : (
                            <a
                              href={pageHref({ edit: book.id }, `item-${book.id}`)}
                              className="text-xs text-zinc-500 dark:text-zinc-400"
                            >
                              ▸ Edit
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {finishedPages > 1 && (
            <nav className="mt-3 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              {finishedPage > 1 ? (
                <a
                  href={pageHref({ page: finishedPage - 1 }, "finished")}
                  className="underline underline-offset-2"
                >
                  ← Newer
                </a>
              ) : (
                <span className="text-zinc-300 dark:text-zinc-700">← Newer</span>
              )}
              <span>
                Page {finishedPage} of {finishedPages}
              </span>
              {finishedPage < finishedPages ? (
                <a
                  href={pageHref({ page: finishedPage + 1 }, "finished")}
                  className="underline underline-offset-2"
                >
                  Older →
                </a>
              ) : (
                <span className="text-zinc-300 dark:text-zinc-700">Older →</span>
              )}
            </nav>
          )}

          {isAdmin && (
            <details className="mt-3 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
              <summary className="cursor-pointer text-sm text-zinc-500 dark:text-zinc-400">
                {club.text.addFinishedSummary}
              </summary>
              <AddReadBookForm action={addReadBook} />
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

        {/* Background images (admin only) */}
        {isAdmin && !showBackground && (
          <section id="background">
            <a
              href={pageHref({ background: true }, "background")}
              className="text-sm text-zinc-500 dark:text-zinc-400"
            >
              ▸ Manage background images
            </a>
          </section>
        )}
        {isAdmin && showBackground && (
          <section id="background">
            <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Background images
            </h2>
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              {club.text.backgroundIntro}{" "}
              <a
                href={pageHref({}, "background")}
                className="underline underline-offset-2"
              >
                Close
              </a>
            </p>
            <div className="mb-4">
              <BackgroundSettingsForm
                settings={backgroundSettings}
                action={updateBackgroundSettings}
              />
            </div>
            <BackgroundCoverAdmin
              covers={covers}
              addAction={addBackgroundCover}
              replaceAction={replaceBackgroundCover}
              deleteAction={deleteBackgroundCover}
              reorderAction={reorderBackgroundCovers}
            />
          </section>
        )}
      </main>

      {/* Required by TMDB's API terms for the movie club. */}
      {club.searchProvider === "tmdb" && (
        <footer className="mx-auto max-w-3xl px-6 pb-10 text-xs text-zinc-500 dark:text-zinc-400">
          <p className="inline-block rounded bg-white/90 px-2 py-1 dark:bg-zinc-950/90">
            Movie data and posters from{" "}
            <a
              href="https://www.themoviedb.org/"
              className="underline underline-offset-2"
            >
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
        </footer>
      )}
    </div>
  );
}
