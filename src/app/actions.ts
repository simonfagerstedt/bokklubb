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

export async function addSuggestion(formData: FormData) {
  const { supabase, userId } = await requireMember();

  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const pitch = String(formData.get("pitch") ?? "").trim();
  if (!title || !author) return;

  await supabase.from("books").insert({
    title,
    author,
    pitch: pitch || null,
    status: "suggested",
    added_by: userId,
  });

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
    await supabase
      .from("suggestion_votes")
      .delete()
      .eq("book_id", bookId)
      .eq("member_id", userId);
  } else {
    await supabase
      .from("suggestion_votes")
      .insert({ book_id: bookId, member_id: userId });
  }

  revalidatePath("/");
}

export async function addReview(bookId: string, formData: FormData) {
  const { supabase, userId } = await requireMember();

  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();
  if (!rating || rating < 1 || rating > 5) return;

  await supabase
    .from("reviews")
    .upsert(
      { book_id: bookId, member_id: userId, rating, body: body || null },
      { onConflict: "book_id,member_id" },
    );

  revalidatePath("/");
}

export async function markAsCurrent(bookId: string) {
  const { supabase } = await requireMember();

  // Only one book is "current" at a time: bump whatever was current to
  // "read", then promote this one.
  await supabase
    .from("books")
    .update({ status: "read", finished_at: new Date().toISOString() })
    .eq("status", "current");

  await supabase.from("books").update({ status: "current" }).eq("id", bookId);

  revalidatePath("/");
}

export async function finishCurrentBook(bookId: string) {
  const { supabase } = await requireMember();

  await supabase
    .from("books")
    .update({ status: "read", finished_at: new Date().toISOString() })
    .eq("id", bookId);

  revalidatePath("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
