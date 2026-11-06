/**
 * The shape both search providers (Open Library for the book club, TMDB
 * for the movie club) return, so the search UI doesn't care which one it
 * is talking to. "author" is the director for a movie.
 */
export type BookSearchResult = {
  /** Provider-specific id, passed back to /api/book-details on pick. */
  key: string;
  title: string;
  /** May be empty when the provider only knows it after a details fetch. */
  author: string;
  /** Title in the original language, when it differs from `title`. */
  originalTitle: string | null;
  year: number | null;
  coverUrl: string | null;
  thumbUrl: string | null;
};

/** Extra details fetched once a search result is picked. */
export type BookDetails = {
  description: string | null;
  /** Set when the search result couldn't know it (TMDB's director). */
  author?: string | null;
};

export class SearchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type SearchProvider = {
  search(q: string): Promise<BookSearchResult[]>;
  /** Guards /api/book-details: only keys this provider itself returned. */
  isValidKey(key: string): boolean;
  details(key: string): Promise<BookDetails>;
};
