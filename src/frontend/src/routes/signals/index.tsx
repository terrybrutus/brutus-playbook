import { SignalCard } from "@/components/signals/SignalCard";
import {
  ALL_FILTER,
  type FilterKey,
  SignalFilters,
  type SignalFiltersValue,
} from "@/components/signals/SignalFilters";
import {
  SignalSortControls,
  type SignalSortValue,
} from "@/components/signals/SignalSortControls";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import type { ParsedRow } from "@/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Activity, FileSearch, Loader2, Upload } from "lucide-react";
import { useMemo } from "react";

/**
 * Signals feed page.
 *
 * Renders a chronological list of generated trade setups (only rows with a
 * non-no_trade regime) as clickable cards. Filter state (asset, timeframe,
 * regime, session) and sort state (key + direction) persist via URL search
 * params using TanStack Router's useSearch / navigate.
 *
 * Educational paper-analysis only — not financial advice.
 */

// --- URL search-param schema ----------------------------------------------

const SORT_KEYS = ["time", "touchDepthRatio", "rsi"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

function readSearch(
  raw: Record<string, unknown>,
): SignalFiltersValue & SignalSortValue {
  const str = (v: unknown, fallback: string): string =>
    typeof v === "string" && v.length > 0 ? v : fallback;
  const key = str(raw.sort, "time");
  const dir = str(raw.dir, "desc");
  return {
    asset: str(raw.asset, ALL_FILTER),
    timeframe: str(raw.timeframe, ALL_FILTER),
    regime: str(raw.regime, ALL_FILTER),
    session: str(raw.session, ALL_FILTER),
    key: (SORT_KEYS as readonly string[]).includes(key)
      ? (key as SignalSortValue["key"])
      : "time",
    dir: (SORT_DIRS as readonly string[]).includes(dir)
      ? (dir as SignalSortValue["dir"])
      : "desc",
  };
}

// --- Filtering + sorting --------------------------------------------------

function applyFilters(rows: ParsedRow[], f: SignalFiltersValue): ParsedRow[] {
  return rows.filter((r) => {
    if (f.asset !== ALL_FILTER && r.asset !== f.asset) return false;
    if (f.timeframe !== ALL_FILTER && r.timeframe !== f.timeframe) return false;
    if (f.regime !== ALL_FILTER && r.regime !== f.regime) return false;
    if (f.session !== ALL_FILTER && r.sessionLabel !== f.session) return false;
    return true;
  });
}

function applySort(rows: ParsedRow[], s: SignalSortValue): ParsedRow[] {
  const dir = s.dir === "asc" ? 1 : -1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (s.key === "time") {
      const ta = Date.parse(a.timestamp) || 0;
      const tb = Date.parse(b.timestamp) || 0;
      return (ta - tb) * dir;
    }
    if (s.key === "touchDepthRatio") {
      return (a.touchDepthRatio - b.touchDepthRatio) * dir;
    }
    // rsi
    const ra = a.derivedRsi ?? -1;
    const rb = b.derivedRsi ?? -1;
    return (ra - rb) * dir;
  });
  return sorted;
}

// --- Page component --------------------------------------------------------

export function SignalsPage() {
  const navigate = useNavigate({ from: "/signals" });
  const search = useSearch({ from: "/signals" });
  const params = readSearch(search as Record<string, unknown>);

  const rows = useAppStore((s) => s.rows);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const datasetName = useAppStore((s) => s.datasetName);
  const loadSampleDataset = useAppStore((s) => s.loadSampleDataset);

  // Only rows with a non-no_trade regime qualify as signals. MTF alignment
  // filters lower-TF triggers against the 1h bias: misaligned triggers are
  // excluded from the feed. Rows with no_htf_data are kept (we can't determine
  // alignment without higher-TF data, so we don't suppress them).
  const signals = useMemo(
    () =>
      rows.filter(
        (r) => r.regime !== "no_trade" && r.mtfAlignment !== "misaligned",
      ),
    [rows],
  );

  // Distinct filter option values derived from the signal set.
  const { assets, timeframes } = useMemo(() => {
    const assetSet = new Set<string>();
    const tfSet = new Set<string>();
    for (const r of signals) {
      assetSet.add(r.asset);
      tfSet.add(r.timeframe);
    }
    return {
      assets: [...assetSet].sort(),
      timeframes: [...tfSet].sort(),
    };
  }, [signals]);

  const filtered = useMemo(
    () => applyFilters(signals, params),
    [signals, params],
  );
  const sorted = useMemo(() => applySort(filtered, params), [filtered, params]);

  const hasActiveFilter =
    params.asset !== ALL_FILTER ||
    params.timeframe !== ALL_FILTER ||
    params.regime !== ALL_FILTER ||
    params.session !== ALL_FILTER;

  const updateParam = (key: FilterKey | "sort" | "dir", next: string) => {
    const merged = { ...params, [key]: next } as Record<string, string>;
    // Drop default values so the URL stays clean.
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(merged)) {
      if (
        k === "asset" ||
        k === "timeframe" ||
        k === "regime" ||
        k === "session"
      ) {
        if (v !== ALL_FILTER) cleaned[k] = v;
      } else if (k === "sort") {
        if (v !== "time") cleaned[k] = v;
      } else if (k === "dir") {
        if (v !== "desc") cleaned[k] = v;
      }
    }
    navigate({ to: "/signals", search: cleaned, replace: false });
  };

  const updateSort = (next: SignalSortValue) => {
    const merged = { ...params, ...next };
    const cleaned: Record<string, string> = {};
    if (merged.asset !== ALL_FILTER) cleaned.asset = merged.asset;
    if (merged.timeframe !== ALL_FILTER) cleaned.timeframe = merged.timeframe;
    if (merged.regime !== ALL_FILTER) cleaned.regime = merged.regime;
    if (merged.session !== ALL_FILTER) cleaned.session = merged.session;
    if (merged.key !== "time") cleaned.sort = merged.key;
    if (merged.dir !== "desc") cleaned.dir = merged.dir;
    navigate({ to: "/signals", search: cleaned, replace: false });
  };

  const resetFilters = () => {
    const cleaned: Record<string, string> = {};
    if (params.key !== "time") cleaned.sort = params.key;
    if (params.dir !== "desc") cleaned.dir = params.dir;
    navigate({ to: "/signals", search: cleaned, replace: false });
  };

  return (
    <section
      data-ocid="signals.page"
      className="mx-auto max-w-[1400px] px-4 py-6"
    >
      {/* Page header */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-foreground">
            <Activity className="size-5 text-primary" aria-hidden="true" />
            Signals
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Chronological feed of classified snapback / push-through setups
            {datasetName ? ` · ${datasetName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="rounded-md border border-border bg-card px-2 py-1">
            {filtered.length} / {signals.length} shown
          </span>
        </div>
      </header>

      {/* Controls */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SignalFilters
          value={params}
          onChange={updateParam}
          onReset={resetFilters}
          assets={assets}
          timeframes={timeframes}
          hasActiveFilter={hasActiveFilter}
        />
        <SignalSortControls value={params} onChange={updateSort} />
      </div>

      {/* Body */}
      <SignalsBody
        isLoading={isLoading}
        error={error}
        hasDataset={rows.length > 0}
        signals={sorted}
        onLoadSample={loadSampleDataset}
      />
    </section>
  );
}

interface SignalsBodyProps {
  isLoading: boolean;
  error: string | null;
  hasDataset: boolean;
  signals: ParsedRow[];
  onLoadSample: () => void;
}

function SignalsBody({
  isLoading,
  error,
  hasDataset,
  signals,
  onLoadSample,
}: SignalsBodyProps) {
  if (isLoading) {
    return (
      <div
        data-ocid="signals.loading_state"
        className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-16 text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        <span className="font-mono text-xs uppercase tracking-wider">
          Loading dataset…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-ocid="signals.error_state"
        className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-10 text-center"
      >
        <p className="font-mono text-xs uppercase tracking-wider text-destructive">
          Failed to load dataset
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!hasDataset) {
    return (
      <div
        data-ocid="signals.empty_state"
        className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-16 text-center"
      >
        <FileSearch
          className="size-8 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <p className="font-display text-base font-semibold text-foreground">
            No dataset loaded
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Load the sample TradingView alert log to populate the signals feed.
          </p>
        </div>
        <Button
          data-ocid="signals.load_sample_button"
          onClick={onLoadSample}
          variant="default"
          size="sm"
        >
          <Upload className="size-4" aria-hidden="true" />
          Load sample dataset
        </Button>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div
        data-ocid="signals.no_matches.empty_state"
        className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-16 text-center"
      >
        <FileSearch
          className="size-8 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <p className="font-display text-base font-semibold text-foreground">
            No signals match the current filters
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Adjust the asset, timeframe, regime, or session filters above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul
      data-ocid="signals.list"
      aria-label="Trade signal setups"
      className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {signals.map((row, i) => (
        <SignalCard key={row.alertId} row={row} index={i + 1} />
      ))}
    </ul>
  );
}
