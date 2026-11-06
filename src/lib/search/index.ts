import { club } from "@/club";
import { openLibrary } from "./openLibrary";
import { tmdb } from "./tmdb";
import type { SearchProvider } from "./types";

/** The search provider for this deployment's club (see src/club.ts). */
export const searchProvider: SearchProvider =
  club.searchProvider === "tmdb" ? tmdb : openLibrary;

export * from "./types";
