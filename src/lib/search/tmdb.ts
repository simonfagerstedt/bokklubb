import {
  SearchError,
  type BookDetails,
  type BookSearchResult,
  type SearchProvider,
} from "./types";

/**
 * The Movie Database (themoviedb.org), for the movie club. Needs the
 * TMDB_API_KEY secret on the Worker: the "API Read Access Token" from
 * themoviedb.org → Settings → API, sent as a Bearer token.
 *
 * Titles and overviews are asked for in Swedish, falling back to English
 * when TMDB has no Swedish overview. The original-language title goes in
 * originalTitle when it differs.
 */
const LANGUAGE = "sv-SE";
const FALLBACK_LANGUAGE = "en-US";
const API = "https://api.themoviedb.org/3";
const IMAGES = "https://image.tmdb.org/t/p";

type TmdbMovie = {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string; // "YYYY-MM-DD", or "" when unknown
  poster_path?: string | null;
};

type TmdbMovieDetails = {
  overview?: string;
  credits?: { crew?: { job?: string; name?: string }[] };
};

function yearOf(releaseDate: string | undefined): number | null {
  const year = Number(releaseDate?.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

export function mapTmdbMovies(movies: TmdbMovie[]): BookSearchResult[] {
  return movies
    .filter((m) => m.title)
    .slice(0, 8)
    .map((m) => ({
      key: String(m.id),
      title: m.title as string,
      // Search results don't include credits; the director comes from
      // details() once a result is picked.
      author: "",
      originalTitle:
        m.original_title && m.original_title !== m.title
          ? m.original_title
          : null,
      year: yearOf(m.release_date),
      coverUrl: m.poster_path ? `${IMAGES}/w500${m.poster_path}` : null,
      thumbUrl: m.poster_path ? `${IMAGES}/w92${m.poster_path}` : null,
    }));
}

export function directorsOf(details: TmdbMovieDetails): string | null {
  const names = (details.credits?.crew ?? [])
    .filter((c) => c.job === "Director" && c.name)
    .map((c) => c.name as string);
  return names.length > 0 ? [...new Set(names)].join(", ") : null;
}

async function tmdbGet<T>(path: string, params: Record<string, string>) {
  const token = process.env.TMDB_API_KEY;
  if (!token) {
    throw new SearchError("Movie search isn't set up (no TMDB key).", 503);
  }
  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
  } catch {
    throw new SearchError("Couldn't reach TMDB.", 502);
  }
  if (!response.ok) throw new SearchError("Couldn't reach TMDB.", 502);
  return (await response.json()) as T;
}

export const tmdb: SearchProvider = {
  async search(q) {
    const data = await tmdbGet<{ results?: TmdbMovie[] }>("/search/movie", {
      query: q,
      language: LANGUAGE,
      include_adult: "false",
      page: "1",
    });
    return mapTmdbMovies(data.results ?? []);
  },

  // Only ever a numeric movie id we ourselves returned from search.
  isValidKey: (key) => /^\d{1,10}$/.test(key),

  async details(key): Promise<BookDetails> {
    const data = await tmdbGet<TmdbMovieDetails>(`/movie/${key}`, {
      language: LANGUAGE,
      append_to_response: "credits",
    });
    let description = data.overview?.trim() || null;
    if (!description) {
      const fallback = await tmdbGet<TmdbMovieDetails>(`/movie/${key}`, {
        language: FALLBACK_LANGUAGE,
      }).catch(() => null);
      description = fallback?.overview?.trim() || null;
    }
    return { description, author: directorsOf(data) };
  },
};
