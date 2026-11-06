import {
  SearchError,
  type BookDetails,
  type BookSearchResult,
  type SearchProvider,
} from "./types";

type OpenLibraryDoc = {
  key: string; // e.g. "/works/OL262758W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
};

const headers = { "User-Agent": "Bokcirkeln (book club app)" };

function unreachable(): never {
  throw new SearchError("Couldn't reach Open Library.", 502);
}

export function mapOpenLibraryDocs(docs: OpenLibraryDoc[]): BookSearchResult[] {
  return docs
    .filter((doc) => doc.title)
    .map((doc) => ({
      key: doc.key,
      title: doc.title,
      author: doc.author_name?.[0] ?? "Unknown author",
      originalTitle: null,
      year: doc.first_publish_year ?? null,
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : null,
      thumbUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`
        : null,
    }));
}

export const openLibrary: SearchProvider = {
  async search(q) {
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
        headers,
        // Open Library results don't change fast enough to need live data
        // on every keystroke.
        next: { revalidate: 3600 },
      });
    } catch {
      unreachable();
    }
    if (!response.ok) unreachable();

    const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
    return mapOpenLibraryDocs(data.docs ?? []);
  },

  // Only ever a work key we ourselves returned from search, e.g.
  // "/works/OL262758W" — reject anything else so this can't be used to
  // fetch arbitrary Open Library (or, via a malformed key, other) paths.
  isValidKey: (key) => /^\/works\/OL\d+W$/.test(key),

  async details(key): Promise<BookDetails> {
    let response: Response;
    try {
      response = await fetch(`https://openlibrary.org${key}.json`, {
        headers,
        next: { revalidate: 3600 },
      });
    } catch {
      unreachable();
    }
    if (!response.ok) unreachable();

    const data = (await response.json()) as {
      description?: string | { value?: string };
    };
    const description =
      typeof data.description === "string"
        ? data.description
        : (data.description?.value ?? null);
    return { description };
  },
};
