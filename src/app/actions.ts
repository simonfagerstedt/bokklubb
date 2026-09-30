"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to do that.");
  return { supabase, userId: user.id };
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
  if (!title || !author) return;

  const { error } = await supabase.from("books").insert({
    title,
    author,
    pitch: pitch || null,
    status: "suggested",
    added_by: userId,
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
  if (!rating || rating < 1 || rating > 5) return;

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

export async function markAsCurrent(bookId: string) {
  const { supabase } = await requireAdmin();

  // Only one book is "current" at a time: bump whatever was current to
  // "read", then promote this one.
  const { error: bumpError } = await supabase
    .from("books")
    .update({ status: "read", finished_at: new Date().toISOString() })
    .eq("status", "current");
  if (bumpError) throw new Error(bumpError.message);

  const { error } = await supabase
    .from("books")
    .update({ status: "current" })
    .eq("id", bookId);
  if (error) throw new Error(error.message);

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

  // Only present on the "read" books' edit form — don't touch it otherwise.
  if (formData.has("finished_at")) {
    const finishedAtRaw = String(formData.get("finished_at") ?? "").trim();
    updates.finished_at = finishedAtRaw
      ? new Date(finishedAtRaw).toISOString()
      : null;
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
  const finishedAtRaw = String(formData.get("finished_at") ?? "").trim();
  if (!title || !author) return;

  const finishedAt = finishedAtRaw
    ? new Date(finishedAtRaw).toISOString()
    : new Date().toISOString();

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
