"use client";

import { useRef, useState } from "react";

const MIN_YEAR = 1000;
const MAX_YEAR = 2100;

/**
 * Validates a "YYYY-MM-DD" string the way the server does (parseFinishedAt
 * in actions.ts) — kept in front of the same bug that caused the
 * "time zone displacement out of range" crash: some browsers (Safari in
 * particular) let extra digits leak into a date input's year segment if
 * you type quickly, e.g. "202601-01-07" instead of "2026-01-07". Returns
 * an error message, or null when the value is fine (an empty value is
 * fine too — the field is optional).
 */
function validateDate(value: string): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "Please enter a full date.";
  const [year, month, day] = match.slice(1).map(Number);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return `Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "That's not a real date.";
  }
  return null;
}

/**
 * The "Finished on" date field, shared by the book-edit form and the "add
 * a book you've already read" form. Validates as the person types/picks,
 * blocking submission (via the native HTML5 constraint API) and showing an
 * inline message if the value is malformed or has an out-of-range year —
 * the same check the server applies, so a bad value never reaches it.
 */
export function FinishedAtField({
  defaultValue = "",
}: {
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(() =>
    validateDate(defaultValue),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(next: string) {
    setValue(next);
    const message = validateDate(next);
    setError(message);
    inputRef.current?.setCustomValidity(message ?? "");
  }

  return (
    <label className="col-span-2 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400 sm:col-span-1">
      <span className="flex items-center gap-2">
        Finished on
        <input
          ref={inputRef}
          name="finished_at"
          type="date"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          min={`${MIN_YEAR}-01-01`}
          max={`${MAX_YEAR}-12-31`}
          className="flex-1 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </span>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}
