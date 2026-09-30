import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Fetches a single Open Library work's description, once a search result
 * has actually been picked (kept separate from /api/book-search so a
 * search-as-you-type doesn't fetch descriptions for results nobody chose).
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
  // Only ever a work key we ourselves returned from /api/book-search, e.g.
  // "/works/OL262758W" — reject anything else so this can't be used to
  // fetch arbitrary Open Library (or, via a malformed key, other) paths.
  if (!key || !/^\/works\/OL\d+W$/.test(key)) {
    return NextResponse.json({ error: "Invalid work key." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`https://openlibrary.org${key}.json`, {
      headers: { "User-Agent": "Bokcirkeln (book club app)" },
      next: { revalidate: 3600 },
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach Open Library." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "Couldn't reach Open Library." },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    description?: string | { value?: string };
  };
  const description =
    typeof data.description === "string"
      ? data.description
      : (data.description?.value ?? null);

  return NextResponse.json({ description });
}
