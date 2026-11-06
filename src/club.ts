/**
 * Which club this deployment is: the book club (Bokcirkeln) or the movie
 * club (Filmklubben). Both run the same code against their own Supabase
 * project; everything that differs between them lives here.
 *
 * Chosen at build time by NEXT_PUBLIC_CLUB ("book" | "film"), which the
 * Deploy workflow sets per club. NEXT_PUBLIC_* is inlined into both the
 * server and the client bundle, so this module works in Server and Client
 * Components alike. Unset (local dev, CI) means the book club.
 */

export type ClubKind = "book" | "film";

export type ClubConfig = {
  kind: ClubKind;
  /** Site name: header, browser tab. */
  name: string;
  /** Shown before the name in the header. */
  emoji: string;
  /** Which service the search boxes query (see src/lib/search). */
  searchProvider: "openlibrary" | "tmdb";
  /** Its name, used in the search texts. */
  searchProviderName: string;
  /**
   * Background collage used when the background_covers table is empty
   * (e.g. an admin removed everything). An empty list shows a plain
   * background instead.
   */
  fallbackBackgroundCovers: string[];
  text: {
    // "Currently …" section
    currentHeading: string;
    noCurrent: string;
    markFinished: string;
    editDetails: string;
    // Suggestions section
    suggestionsHeading: string;
    startCurrent: string;
    signInToSuggest: string;
    pitchPlaceholder: string;
    suggestButton: string;
    // Finished section
    finishedHeading: string;
    /** Lowercase prefix before the date on a finished item. */
    finishedPrefix: string;
    finishedOn: string;
    addFinishedSummary: string;
    addFinishedButton: string;
    // An item (book or movie)
    creatorLabel: string;
    coverAlt: (title: string) => string;
    coverUrlPlaceholder: string;
    deleteItem: string;
    deleteReviewConfirm: string;
    // Background images admin panel
    backgroundIntro: string;
    backgroundCoverUrlPlaceholder: string;
    addBackgroundCover: string;
    addAnotherBackgroundCover: string;
    dragToReorder: string;
    removeBackgroundCoverConfirm: string;
    // Search boxes
    searchPlaceholder: string;
    coverSearchPlaceholder: string;
    searchError: string;
  };
};

const bookClub: ClubConfig = {
  kind: "book",
  name: "Bokcirkeln",
  emoji: "📚",
  searchProvider: "openlibrary",
  searchProviderName: "Open Library",
  // A mix of classics and modern reads, not tied to what the club is
  // actually reading.
  fallbackBackgroundCovers: [
    "https://covers.openlibrary.org/b/id/8467127-L.jpg", // Pride and Prejudice
    "https://covers.openlibrary.org/b/id/12927145-L.jpg", // Circe
    "https://covers.openlibrary.org/b/id/106239-L.jpg", // Moby-Dick
    "https://covers.openlibrary.org/b/id/12816990-L.jpg", // Tomorrow, and Tomorrow, and Tomorrow
    "https://covers.openlibrary.org/b/id/10616570-L.jpg", // Nineteen Eighty-Four
    "https://covers.openlibrary.org/b/id/9158360-L.jpg", // Normal People
    "https://covers.openlibrary.org/b/id/12622046-L.jpg", // Crime and Punishment
    "https://covers.openlibrary.org/b/id/15208263-L.jpg", // Project Hail Mary
    "https://covers.openlibrary.org/b/id/15098734-L.jpg", // Jane Eyre
    "https://covers.openlibrary.org/b/id/12866714-L.jpg", // Babel
    "https://covers.openlibrary.org/b/id/2325007-L.jpg", // Frankenstein
    "https://covers.openlibrary.org/b/id/15212562-L.jpg", // The Overstory
    "https://covers.openlibrary.org/b/id/8236262-L.jpg", // Anna Karenina
    "https://covers.openlibrary.org/b/id/12446638-L.jpg", // The Song of Achilles
    "https://covers.openlibrary.org/b/id/8238786-L.jpg", // The Great Gatsby
    "https://covers.openlibrary.org/b/id/13011435-L.jpg", // Piranesi
    "https://covers.openlibrary.org/b/id/13496213-L.jpg", // Wuthering Heights
    "https://covers.openlibrary.org/b/id/8815122-L.jpg", // Educated
    "https://covers.openlibrary.org/b/id/12622155-L.jpg", // Dracula
    "https://covers.openlibrary.org/b/id/6533183-L.jpg", // Älskaren (L'Amant)
    "https://covers.openlibrary.org/b/id/10871487-L.jpg", // Klara and the Sun
  ],
  text: {
    currentHeading: "Currently reading",
    noCurrent:
      "Nobody's reading anything right now — promote a suggestion below.",
    markFinished: "Mark as finished",
    editDetails: "Edit book details",
    suggestionsHeading: "Suggestions for next book",
    startCurrent: "Start reading",
    signInToSuggest: "to suggest a book or vote.",
    pitchPlaceholder: "Why should we read it? (optional)",
    suggestButton: "Suggest a book",
    finishedHeading: "Books read",
    finishedPrefix: "finished",
    finishedOn: "Finished on",
    addFinishedSummary: "Add a book you've already read",
    addFinishedButton: "Add book",
    creatorLabel: "Author",
    coverAlt: (title) => `Cover of ${title}`,
    coverUrlPlaceholder: "Cover image URL",
    deleteItem: "Delete book",
    deleteReviewConfirm: "Delete your review of this book?",
    backgroundIntro:
      "The faded cover collage behind the page. Search Open Library to replace any of these, or add more, and drag to reorder.",
    backgroundCoverUrlPlaceholder: "Cover image URL — or paste your own",
    addBackgroundCover: "Add cover",
    addAnotherBackgroundCover: "Add another cover",
    dragToReorder: "Drag a cover to reorder the collage.",
    removeBackgroundCoverConfirm: "Remove this cover from the background?",
    searchPlaceholder: "🔍 Search Open Library to fill in the details below…",
    coverSearchPlaceholder: "🔍 Search Open Library for a cover…",
    searchError: "Couldn't search Open Library right now.",
  },
};

const filmSearch = "TMDB";

const filmClub: ClubConfig = {
  kind: "film",
  name: "Filmklubben",
  emoji: "🎬",
  searchProvider: "tmdb",
  searchProviderName: filmSearch,
  // No fallback posters yet: a plain background until admins add some.
  fallbackBackgroundCovers: [],
  text: {
    currentHeading: "Currently watching",
    noCurrent:
      "Nobody's watching anything right now — promote a suggestion below.",
    markFinished: "Mark as watched",
    editDetails: "Edit movie details",
    suggestionsHeading: "Suggestions for next movie",
    startCurrent: "Start watching",
    signInToSuggest: "to suggest a movie or vote.",
    pitchPlaceholder: "Why should we watch it? (optional)",
    suggestButton: "Suggest a movie",
    finishedHeading: "Movies watched",
    finishedPrefix: "watched",
    finishedOn: "Watched on",
    addFinishedSummary: "Add a movie you've already watched",
    addFinishedButton: "Add movie",
    creatorLabel: "Director",
    coverAlt: (title) => `Poster of ${title}`,
    coverUrlPlaceholder: "Poster image URL",
    deleteItem: "Delete movie",
    deleteReviewConfirm: "Delete your review of this movie?",
    backgroundIntro: `The faded poster collage behind the page. Search ${filmSearch} to replace any of these, or add more, and drag to reorder.`,
    backgroundCoverUrlPlaceholder: "Poster image URL — or paste your own",
    addBackgroundCover: "Add poster",
    addAnotherBackgroundCover: "Add another poster",
    dragToReorder: "Drag a poster to reorder the collage.",
    removeBackgroundCoverConfirm: "Remove this poster from the background?",
    searchPlaceholder: `🔍 Search ${filmSearch} to fill in the details below…`,
    coverSearchPlaceholder: `🔍 Search ${filmSearch} for a poster…`,
    searchError: `Couldn't search ${filmSearch} right now.`,
  },
};

export const club: ClubConfig =
  process.env.NEXT_PUBLIC_CLUB === "film" ? filmClub : bookClub;
