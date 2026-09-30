import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type OpenLibraryDoc = {
  key: string; // e.g. "/works/OL262758W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
};

export type BookSearchResult = {
  key: string;
  title: string;
  author: string;
  year: number | null;
  coverUrl: string | null;
  thumbUrl: string | null;
};

/**
 * Proxies Open Library's search so the browser never calls a third-party
 * host directly, and so results are shaped to exactly what the "search a
 * book" UI needs. Signed-in members only, to keep this from being an open
 * relay for anyone who finds the URL.
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

  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i",
  );
  url.searchParams.set("limit", "8");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "Bokcirkeln (book club app)" },
      // Open Library results don't change fast enough to need live data
      // on every keystroke.
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

  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
  const results: BookSearchResult[] = (data.docs ?? [])
    .filter((doc) => doc.title)
    .map((doc) => ({
      key: doc.key,
      title: doc.title,
      author: doc.author_name?.[0] ?? "Unknown author",
      year: doc.first_publish_year ?? null,
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : null,
      thumbUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`
        : null,
    }));

  return NextResponse.json({ results });
}
