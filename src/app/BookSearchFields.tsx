"use client";

import { useEffect, useRef, useState } from "react";
import type { BookSearchResult } from "./api/book-search/route";

const fieldClass =
  "col-span-2 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-1";

/**
 * Title/author/cover/original-title/year/description fields for a book
 * form, with an optional "search Open Library" box above them that fills
 * the fields in on pick. Everything stays a normal named input, so the
 * surrounding <form>'s Server Action submits exactly as it did before —
 * this component only pre-fills it. Manual typing always still works,
 * whether or not the search finds (or is used for) anything.
 */
export function BookSearchFields({
  idPrefix,
  descriptionRows = 2,
}: {
  idPrefix: string;
  descriptionRows?: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [fillingKey, setFillingKey] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [publishedYear, setPublishedYear] = useState("");
  const [description, setDescription] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/book-search?q=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search failed.");
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setSearchError("Couldn't search Open Library right now.");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
    }
  }

  async function pick(result: BookSearchResult) {
    setTitle(result.title);
    setAuthor(result.author);
    setCoverUrl(result.coverUrl ?? "");
    setPublishedYear(result.year ? String(result.year) : "");
    setOpen(false);
    setQuery("");

    setFillingKey(result.key);
    try {
      const res = await fetch(
        `/api/book-details?key=${encodeURIComponent(result.key)}`,
      );
      const data = await res.json();
      if (res.ok && data.description) {
        setDescription(data.description);
      }
    } catch {
      // Description is a nice-to-have; leave it blank if this fails.
    } finally {
      setFillingKey(null);
    }
  }

  return (
    <>
      <div className="col-span-2 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="🔍 Search Open Library to fill in the details below…"
          className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {searching && (
          <p className="mt-1 text-xs text-zinc-400">Searching…</p>
        )}
        {searchError && (
          <p className="mt-1 text-xs text-red-500">{searchError}</p>
        )}
        {open && results.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-72 w-full min-w-[22rem] max-w-[90vw] overflow-auto rounded border border-zinc-300 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {results.map((r) => (
              <li key={r.key}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(r)}
                  className="flex w-full items-start gap-2 px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {r.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.thumbUrl}
                      alt=""
                      className="h-10 w-7 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="h-10 w-7 shrink-0 rounded bg-zinc-100 dark:bg-zinc-800" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-zinc-900 dark:text-zinc-50">
                      {r.title}
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {r.author}
                      {r.year ? ` — ${r.year}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
        className={fieldClass}
      />
      <input
        name="author"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Author"
        required
        className={fieldClass}
      />
      <input
        name="cover_url"
        value={coverUrl}
        onChange={(e) => setCoverUrl(e.target.value)}
        placeholder="Cover image URL"
        className="col-span-2 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="original_title"
        value={originalTitle}
        onChange={(e) => setOriginalTitle(e.target.value)}
        placeholder="Original title (optional)"
        className={fieldClass}
      />
      <input
        name="published_year"
        type="number"
        value={publishedYear}
        onChange={(e) => setPublishedYear(e.target.value)}
        placeholder="Year"
        className={fieldClass}
      />
      <textarea
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={
          fillingKey ? "Fetching description…" : "Description (optional)"
        }
        rows={descriptionRows}
        className="col-span-2 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        id={`${idPrefix}-description`}
      />
    </>
  );
}
