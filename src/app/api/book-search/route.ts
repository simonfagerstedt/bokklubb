import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchProvider, SearchError } from "@/lib/search";

export type { BookSearchResult } from "@/lib/search";

/**
 * Proxies the club's search provider (Open Library for books, TMDB for
 * movies, see src/club.ts) so the browser never calls a third-party host
 * directly, and so results are shaped to exactly what the "search a
 * book/movie" UI needs. Signed-in members only, to keep this from being
 * an open relay for anyone who finds the URL.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to do that." }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchProvider.search(q);
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof SearchError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
