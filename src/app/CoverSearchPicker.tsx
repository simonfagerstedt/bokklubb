"use client";

import { useEffect, useRef, useState } from "react";
import type { BookSearchResult } from "./api/book-search/route";

/**
 * A small "search Open Library for a cover" box: type a title, pick a
 * result, and `onPick` fires with just what a background collage needs
 * (cover URL + a caption). Used both to add a new background cover and to
 * replace an existing one — see BackgroundCoverAdmin.
 */
export function CoverSearchPicker({
  onPick,
  placeholder = "🔍 Search Open Library for a cover…",
  autoFocus = false,
}: {
  onPick: (cover: { url: string; title: string }) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/book-search?q=${encodeURIComponent(q)}`,
        );
        const data = (await res.json()) as {
          results?: BookSearchResult[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Search failed.");
        // Only results with a cover are useful here.
        setResults((data.results ?? []).filter((r) => r.coverUrl));
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

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      {searching && <p className="mt-1 text-xs text-zinc-400">Searching…</p>}
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
                onClick={() => {
                  onPick({ url: r.coverUrl as string, title: r.title });
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.thumbUrl ?? r.coverUrl ?? ""}
                  alt=""
                  className="h-10 w-7 shrink-0 rounded object-cover"
                />
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
  );
}
