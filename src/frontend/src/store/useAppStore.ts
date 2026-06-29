import { loadSampleDataset } from "@/lib/sampleLoader";
import { runStrategyPipeline } from "@/lib/strategyEngine";
import type { AppSettings, ParseWarning, ParsedRow } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { create } from "zustand";

/**
 * Global app store (Zustand).
 *
 * Holds the currently-loaded dataset (parsed rows + computed signals), the
 * configurable settings, and loading/error state. Actions re-run the strategy
 * pipeline whenever the dataset or settings change so the UI always reflects
 * the latest classification.
 */

/**
 * Module-level persister for backend settings persistence.
 * Registered by App.tsx via setSettingsPersister so the store can fire
 * non-blocking backend writes whenever settings change, without the store
 * itself depending on React Query / the actor.
 */
let settingsPersister: ((s: AppSettings) => Promise<void>) | null = null;

/** Register the backend settings writer (called once from App.tsx). */
export function setSettingsPersister(
  fn: ((s: AppSettings) => Promise<void>) | null,
): void {
  settingsPersister = fn;
}

interface AppState {
  /** Parsed rows BEFORE strategy enrichment (kept for re-runs). */
  rawRows: ParsedRow[];
  /** Enriched rows AFTER runStrategyPipeline (what the UI renders). */
  rows: ParsedRow[];
  /** Parser warnings surfaced from the CSV loader. */
  warnings: ParseWarning[];
  /** Number of CSV rows that could not be parsed. */
  skipped: number;
  /** Active dataset name (for display). */
  datasetName: string | null;

  settings: AppSettings;

  isLoading: boolean;
  error: string | null;

  /** Load the shipped sample CSV and run the pipeline. */
  loadSampleDataset: () => Promise<void>;
  /** Load an already-parsed set of rows (e.g. from an upload) and run pipeline. */
  loadRows: (
    rows: ParsedRow[],
    warnings: ParseWarning[],
    skipped: number,
    name: string,
  ) => void;
  /** Update one or more settings fields, then re-run the pipeline. */
  updateSettings: (patch: Partial<AppSettings>) => void;
  /** Reset settings to defaults and re-run the pipeline. */
  resetSettings: () => void;
  /** Clear the current dataset. */
  clearDataset: () => void;
}

function enrich(rawRows: ParsedRow[], settings: AppSettings): ParsedRow[] {
  // Deep-copy so re-runs don't mutate the same object references across runs.
  const cloned = rawRows.map((r) => ({ ...r }));
  return runStrategyPipeline(cloned, settings);
}

export const useAppStore = create<AppState>((set, get) => ({
  rawRows: [],
  rows: [],
  warnings: [],
  skipped: 0,
  datasetName: null,
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,

  loadSampleDataset: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await loadSampleDataset();
      const settings = get().settings;
      const enriched = enrich(result.rows, settings);
      set({
        rawRows: result.rows,
        rows: enriched,
        warnings: result.warnings,
        skipped: result.skipped,
        datasetName: "Sample — TradingView alerts 2026-06-28",
        isLoading: false,
      });
    } catch (e) {
      set({
        isLoading: false,
        error:
          e instanceof Error ? e.message : "Failed to load sample dataset.",
      });
    }
  },

  loadRows: (rows, warnings, skipped, name) => {
    const settings = get().settings;
    const enriched = enrich(rows, settings);
    set({
      rawRows: rows,
      rows: enriched,
      warnings,
      skipped,
      datasetName: name,
      error: null,
    });
  },

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    const rawRows = get().rawRows;
    const enriched = enrich(rawRows, next);
    set({ settings: next, rows: enriched });
    settingsPersister?.(next).catch(() => {});
  },

  resetSettings: () => {
    const rawRows = get().rawRows;
    const enriched = enrich(rawRows, DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS, rows: enriched });
    settingsPersister?.(DEFAULT_SETTINGS).catch(() => {});
  },

  clearDataset: () => {
    set({
      rawRows: [],
      rows: [],
      warnings: [],
      skipped: 0,
      datasetName: null,
      error: null,
    });
  },
}));
