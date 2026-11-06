"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { club } from "@/club";
import {
  leadingDates,
  parseIsoDate,
  todayInSweden,
  type MeetupDate,
  type MeetupDateVote,
} from "@/lib/meetup";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function requireMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to do that.");
  return { supabase, userId: user.id };
}

/**
 * `<input type="date">` should only ever submit "YYYY-MM-DD", but some
 * browsers (Safari in particular) let extra digits leak into the year
 * segment if you type quickly, producing things like "202601-01-07" — a
 * 6-digit "year" that Postgres rejects with an opaque "time zone
 * displacement out of range" error. Validate defensively and fail with a
 * clear message instead.
 */
function parseFinishedAt(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) throw new Error(`That doesn't look like a valid date: "${trimmed}".`);
  const year = Number(match[1]);
  const currentYear = new Date().getFullYear();
  if (year < 1000 || year > currentYear + 1) {
    throw new Error(`That date's year (${year}) looks wrong — please re-enter it.`);
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`That doesn't look like a valid date: "${trimmed}".`);
  }
  return date.toISOString();
}

async function requireAdmin() {
  const { supabase, userId } = await requireMember();
  const { data: member } = await supabase
    .from("members")
    .select("is_admin")
    .eq("id", userId)
    .single();
  if (!member?.is_admin) throw new Error("Admins only.");
  return { supabase, userId };
}

export async function addSuggestion(formData: FormData) {
  const { supabase, userId } = await requireMember();

  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const pitch = String(formData.get("pitch") ?? "").trim();
  const coverUrl = String(formData.get("cover_url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const originalTitle = String(formData.get("original_title") ?? "").trim();
  const publishedYearRaw = String(formData.get("published_year") ?? "").trim();
  const publishedYear = publishedYearRaw ? Number(publishedYearRaw) : null;
  if (!title || !author) return;

  const { error } = await supabase.from("books").insert({
    title,
    author,
    pitch: pitch || null,
    status: "suggested",
    added_by: userId,
    cover_url: coverUrl || null,
    description: description || null,
    original_title: originalTitle || null,
    published_year:
      publishedYear && Number.isFinite(publishedYear) ? publishedYear : null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function toggleVote(bookId: string) {
  const { supabase, userId } = await requireMember();

  const { data: existing } = await supabase
    .from("suggestion_votes")
    .select("book_id")
    .eq("book_id", bookId)
    .eq("member_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("suggestion_votes")
      .delete()
      .eq("book_id", bookId)
      .eq("member_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("suggestion_votes")
      .insert({ book_id: bookId, member_id: userId });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function addReview(bookId: string, formData: FormData) {
  const { supabase, userId } = await requireMember();

  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > club.maxRating) return;

  const { error } = await supabase
    .from("reviews")
    .upsert(
      { book_id: bookId, member_id: userId, rating, body: body || null },
      { onConflict: "book_id,member_id" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function deleteReview(bookId: string) {
  const { supabase, userId } = await requireMember();

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("book_id", bookId)
    .eq("member_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

/**
 * The meetup date the poll decided: the suggested date with most votes, or,
 * on a tie, the leading date the admin picked (sent as "meet_on"). Null
 * when nobody has suggested a date.
 */
async function decidedMeetDate(
  supabase: Supabase,
  formData: FormData | undefined,
): Promise<string | null> {
  const [{ data: dates, error }, { data: votes, error: votesError }] =
    await Promise.all([
      supabase.from("meetup_dates").select("id, meet_on, suggested_by"),
      supabase.from("meetup_date_votes").select("meetup_date_id, member_id"),
    ]);
  if (error) throw new Error(error.message);
  if (votesError) throw new Error(votesError.message);

  const leaders = leadingDates(
    (dates ?? []) as MeetupDate[],
    (votes ?? []) as MeetupDateVote[],
  );
  if (leaders.length === 0) return null;
  if (leaders.length === 1) return leaders[0];
  const picked = String(formData?.get("meet_on") ?? "");
  if (leaders.includes(picked)) return picked;
  throw new Error(
    "The meetup date vote is a tie. Reload the page and pick one of the leading dates.",
  );
}

/** Empties the meetup date poll (votes go with their dates). Admins only. */
async function clearMeetupDates(supabase: Supabase) {
  const { error } = await supabase
    .from("meetup_dates")
    .delete()
    .not("id", "is", null); // PostgREST refuses a delete with no filter
  if (error) throw new Error(error.message);
}

export async function markAsCurrent(bookId: string, formData?: FormData) {
  const { supabase } = await requireAdmin();
  const meetOn = await decidedMeetDate(supabase, formData);

  // Only one book is "current" at a time: bump whatever was current to
  // "read", then promote this one.
  const { error: bumpError } = await supabase
    .from("books")
    .update({ status: "read", finished_at: new Date().toISOString() })
    .eq("status", "current");
  if (bumpError) throw new Error(bumpError.message);

  const { error } = await supabase
    .from("books")
    .update({ status: "current", meet_on: meetOn })
    .eq("id", bookId);
  if (error) throw new Error(error.message);

  if (meetOn) await clearMeetupDates(supabase);

  revalidatePath("/");
}

export async function finishCurrentBook(bookId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("books")
    .update({ status: "read", finished_at: new Date().toISOString() })
    .eq("id", bookId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function hideSuggestion(bookId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("books")
    .update({ status: "hidden" })
    .eq("id", bookId)
    .eq("status", "suggested");
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function unhideSuggestion(bookId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("books")
    .update({ status: "suggested" })
    .eq("id", bookId)
    .eq("status", "hidden");
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function updateBookDetails(bookId: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const coverUrl = String(formData.get("cover_url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const originalTitle = String(formData.get("original_title") ?? "").trim();
  const publishedYearRaw = String(formData.get("published_year") ?? "").trim();
  const publishedYear = publishedYearRaw ? Number(publishedYearRaw) : null;
  if (!title || !author) return;

  const updates: Record<string, unknown> = {
    title,
    author,
    cover_url: coverUrl || null,
    description: description || null,
    original_title: originalTitle || null,
    published_year:
      publishedYear && Number.isFinite(publishedYear) ? publishedYear : null,
  };

  // Only present on the current item's edit form.
  if (formData.has("meet_on")) {
    const raw = String(formData.get("meet_on") ?? "").trim();
    const meetOn = raw ? parseIsoDate(raw) : null;
    if (raw && !meetOn) {
      throw new Error(`That doesn't look like a valid date: "${raw}".`);
    }
    updates.meet_on = meetOn;
  }

  // Only present on the "read" books' edit form — don't touch it otherwise.
  if (formData.has("finished_at")) {
    updates.finished_at = parseFinishedAt(
      String(formData.get("finished_at") ?? ""),
    );
  }

  const { error } = await supabase
    .from("books")
    .update(updates)
    .eq("id", bookId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function addReadBook(formData: FormData) {
  const { supabase, userId } = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const coverUrl = String(formData.get("cover_url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const originalTitle = String(formData.get("original_title") ?? "").trim();
  const publishedYearRaw = String(formData.get("published_year") ?? "").trim();
  const publishedYear = publishedYearRaw ? Number(publishedYearRaw) : null;
  if (!title || !author) return;

  const finishedAt =
    parseFinishedAt(String(formData.get("finished_at") ?? "")) ??
    new Date().toISOString();

  const { error } = await supabase.from("books").insert({
    title,
    author,
    status: "read",
    added_by: userId,
    cover_url: coverUrl || null,
    description: description || null,
    original_title: originalTitle || null,
    published_year:
      publishedYear && Number.isFinite(publishedYear) ? publishedYear : null,
    finished_at: finishedAt,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function deleteBook(bookId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("books").delete().eq("id", bookId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function suggestMeetupDate(formData: FormData) {
  const { supabase, userId } = await requireMember();

  const raw = String(formData.get("meet_on") ?? "");
  const meetOn = parseIsoDate(raw);
  if (!meetOn) throw new Error(`That doesn't look like a valid date: "${raw}".`);
  const today = todayInSweden();
  if (meetOn < today) throw new Error("Pick a date from today onwards.");
  if (Number(meetOn.slice(0, 4)) > Number(today.slice(0, 4)) + 2) {
    throw new Error("That date is more than two years away.");
  }

  // Suggesting a date someone else already suggested just votes for it.
  let { data: existing } = await supabase
    .from("meetup_dates")
    .select("id")
    .eq("meet_on", meetOn)
    .maybeSingle();
  if (!existing) {
    const { data, error } = await supabase
      .from("meetup_dates")
      .insert({ meet_on: meetOn, suggested_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    existing = data;
  }

  // You can make the day you suggest; 23505 means you'd already voted.
  const { error } = await supabase
    .from("meetup_date_votes")
    .insert({ meetup_date_id: existing.id, member_id: userId });
  if (error && error.code !== "23505") throw new Error(error.message);

  revalidatePath("/");
}

export async function toggleMeetupVote(meetupDateId: string) {
  const { supabase, userId } = await requireMember();

  const { data: existing } = await supabase
    .from("meetup_date_votes")
    .select("meetup_date_id")
    .eq("meetup_date_id", meetupDateId)
    .eq("member_id", userId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("meetup_date_votes")
        .delete()
        .eq("meetup_date_id", meetupDateId)
        .eq("member_id", userId)
    : await supabase
        .from("meetup_date_votes")
        .insert({ meetup_date_id: meetupDateId, member_id: userId });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

/** Your own suggested date, or any as admin (enforced by RLS). */
export async function deleteMeetupDate(meetupDateId: string) {
  const { supabase } = await requireMember();
  const { error } = await supabase
    .from("meetup_dates")
    .delete()
    .eq("id", meetupDateId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/** Sets the current item's meetup date to the poll's winner, then clears the poll. */
export async function finishMeetupVote(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { data: current } = await supabase
    .from("books")
    .select("id")
    .eq("status", "current")
    .maybeSingle();
  // Without a current item, the poll waits for "Make next…" instead.
  if (!current) return;
  const meetOn = await decidedMeetDate(supabase, formData);
  if (!meetOn) return;

  const { error } = await supabase
    .from("books")
    .update({ meet_on: meetOn })
    .eq("id", current.id);
  if (error) throw new Error(error.message);

  await clearMeetupDates(supabase);
  revalidatePath("/");
}

export async function resetMeetupDates() {
  const { supabase } = await requireAdmin();
  await clearMeetupDates(supabase);
  revalidatePath("/");
}

export async function addBackgroundCover(formData: FormData) {
  const { supabase, userId } = await requireAdmin();

  const coverUrl = String(formData.get("cover_url") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!coverUrl) return;

  const { data: existing, error: maxError } = await supabase
    .from("background_covers")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) throw new Error(maxError.message);

  const { error } = await supabase.from("background_covers").insert({
    position: (existing?.position ?? 0) + 1,
    cover_url: coverUrl,
    title: title || null,
    added_by: userId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function replaceBackgroundCover(
  coverId: string,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();

  const coverUrl = String(formData.get("cover_url") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!coverUrl) return;

  const { error } = await supabase
    .from("background_covers")
    .update({ cover_url: coverUrl, title: title || null })
    .eq("id", coverId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function deleteBackgroundCover(coverId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("background_covers")
    .delete()
    .eq("id", coverId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/**
 * Persists a new drag-and-drop order for the background collage: `orderedIds`
 * is every cover's id in its new top-to-bottom/left-to-right order, and each
 * one's `position` is set to its index. Not tied to a <form> — called
 * directly from the admin panel's drop handler.
 */
export async function reorderBackgroundCovers(orderedIds: string[]) {
  const { supabase } = await requireAdmin();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("background_covers")
        .update({ position: index + 1 })
        .eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidatePath("/");
}

function intFormField(
  formData: FormData,
  name: string,
  min: number,
  max: number,
): number {
  const raw = Number(formData.get(name));
  if (!Number.isFinite(raw)) {
    throw new Error(`"${name.replaceAll("_", " ")}" must be a number.`);
  }
  const value = Math.round(raw);
  if (value < min || value > max) {
    throw new Error(
      `"${name.replaceAll("_", " ")}" must be between ${min} and ${max}.`,
    );
  }
  return value;
}

export async function updateBackgroundSettings(formData: FormData) {
  const { supabase } = await requireAdmin();

  const colsMobile = intFormField(formData, "cols_mobile", 1, 20);
  const colsTablet = intFormField(formData, "cols_tablet", 1, 20);
  const colsDesktop = intFormField(formData, "cols_desktop", 1, 20);
  const gapXPercent = intFormField(formData, "gap_x_percent", 0, 100);
  const gapYPercent = intFormField(formData, "gap_y_percent", 0, 100);
  const grayscale = formData.get("color") !== "on";

  const { error } = await supabase
    .from("background_settings")
    .update({
      cols_mobile: colsMobile,
      cols_tablet: colsTablet,
      cols_desktop: colsDesktop,
      gap_x_percent: gapXPercent,
      gap_y_percent: gapYPercent,
      grayscale,
    })
    .eq("id", true);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
