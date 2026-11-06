import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchProvider, SearchError } from "@/lib/search";

/**
 * Fetches the details of one search result (description, and for movies
 * the director), once it has actually been picked (kept separate from
 * /api/book-search so a search-as-you-type doesn't fetch details for
 * results nobody chose).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to do that." }, { status: 401 });
  }

  const key = request.nextUrl.searchParams.get("key");
  if (!key || !searchProvider.isValidKey(key)) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  try {
    return NextResponse.json(await searchProvider.details(key));
  } catch (err) {
    if (err instanceof SearchError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
