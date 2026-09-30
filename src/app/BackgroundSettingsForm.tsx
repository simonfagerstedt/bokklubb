"use client";

import { useState } from "react";

type Settings = {
  colsMobile: number;
  colsTablet: number;
  colsDesktop: number;
  gapXPercent: number;
  gapYPercent: number;
};

/**
 * Admin controls for the background collage's grid: how many cover tiles
 * fit across the screen at three widths (phone/tablet/desktop), and how
 * much gap sits between them, as a % of each tile's own width.
 */
export function BackgroundSettingsForm({
  settings,
  action,
}: {
  settings: Settings;
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
      action={async (formData) => {
        setPending(true);
        setError(null);
        setSaved(false);
        try {
          await action(formData);
          setSaved(true);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Columns (phone)
        </span>
        <input
          name="cols_mobile"
          type="number"
          min={1}
          max={20}
          defaultValue={settings.colsMobile}
          className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Columns (tablet)
        </span>
        <input
          name="cols_tablet"
          type="number"
          min={1}
          max={20}
          defaultValue={settings.colsTablet}
          className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Columns (desktop)
        </span>
        <input
          name="cols_desktop"
          type="number"
          min={1}
          max={20}
          defaultValue={settings.colsDesktop}
          className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Gap horizontal (% of tile width)
        </span>
        <input
          name="gap_x_percent"
          type="number"
          min={0}
          max={100}
          defaultValue={settings.gapXPercent}
          className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Gap vertical (% of tile height)
        </span>
        <input
          name="gap_y_percent"
          type="number"
          min={0}
          max={100}
          defaultValue={settings.gapYPercent}
          className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button
        disabled={pending}
        className="rounded bg-black px-3 py-1.5 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {saved && !pending && (
        <span className="text-xs text-green-600 dark:text-green-400">
          Saved
        </span>
      )}
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
    </form>
  );
}
