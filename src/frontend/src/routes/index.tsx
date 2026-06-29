import { AssetCard } from "@/components/dashboard/AssetCard";
import type { BandWidthRegime } from "@/components/dashboard/AssetCard";
import type { SparklinePoint } from "@/components/dashboard/BandWidthSparkline";
import { DatasetLoader } from "@/components/dashboard/DatasetLoader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/useAppStore";
import type { HtfBias, ParsedRow } from "@/types";
import {
  Activity,
  ArrowRightCircle,
  Filter,
  Gauge,
  Layers,
  TriangleAlert,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";

/**
 * Dashboard / Overview page.
 *
 * Brutus Terminal aesthetic: data-dense card grid, mono price ladders, electric
 * green / amber / coral accents. Educational paper-analysis only.
 *
 * Layout:
 *  - Empty state: prominent loader CTA when no dataset is loaded.
 *  - Loaded state: KPI row (4 cards) + asset card grid + parse warnings.
 */

const PRIORITY_ASSETS = ["DJ30", "US500", "USTEC", "JPN225"] as const;

interface AssetSummary {
  asset: string;
  bias: HtfBias;
  regime: BandWidthRegime;
  activeTriggers: number;
  sparkline: SparklinePoint[];
  bandWidth: number | null;
  bandWidthMa: number | null;
}

interface KpiSummary {
  total: number;
  snapback: number;
  pushThrough: number;
  filtered: number;
}

/** Sort rows by candle time ascending for sparkline + "current" lookups. */
function sortByCandleTime(rows: ParsedRow[]): ParsedRow[] {
  return [...rows].sort(
    (a, b) => (a.candleTimeMs ?? 0) - (b.candleTimeMs ?? 0),
  );
}

/** Classify bandWidth regime from the latest bw vs bw-MA relationship. */
function classifyRegime(bw: number, ma: number | null): BandWidthRegime {
  if (!Number.isFinite(bw)) return "normal";
  if (ma == null || !Number.isFinite(ma)) return "normal";
  const ratio = bw / ma;
  if (ratio < 0.85) return "squeeze";
  if (ratio > 1.15) return "expanded";
  return "normal";
}

/** Compute the per-asset summary used to render AssetCards. */
function computeAssetSummaries(rows: ParsedRow[]): AssetSummary[] {
  const byAsset = new Map<string, ParsedRow[]>();
  for (const r of rows) {
    const arr = byAsset.get(r.asset) ?? [];
    arr.push(r);
    byAsset.set(r.asset, arr);
  }

  const summaries: AssetSummary[] = [];
  for (const [asset, group] of byAsset) {
    const sorted = sortByCandleTime(group);

    // 1h bias: prefer rows whose timeframe is "1h"; fall back to htfBias.
    const h1Rows = sorted.filter((r) => r.timeframe === "1h");
    const biasRows = h1Rows.length > 0 ? h1Rows : sorted;
    const latestBiasRow = biasRows[biasRows.length - 1];
    const bias: HtfBias = latestBiasRow?.htfBias ?? "unknown";

    // bandWidth regime from the latest row with a finite bandWidth.
    const latestWithBw = [...sorted]
      .reverse()
      .find((r) => Number.isFinite(r.bandWidth));
    const bw = latestWithBw?.bandWidth ?? null;
    const bwMa = latestWithBw?.bandWidthMa ?? null;
    const regime = classifyRegime(bw ?? Number.NaN, bwMa);

    // Active aligned triggers: rows with mtfAlignment === "aligned".
    const activeTriggers = group.filter(
      (r) => r.mtfAlignment === "aligned",
    ).length;

    // Sparkline: bandWidth + bandWidth-MA over the asset's full history.
    const sparkline: SparklinePoint[] = sorted.map((r, i) => ({
      i,
      bw: Number.isFinite(r.bandWidth) ? r.bandWidth : null,
      ma: r.bandWidthMa,
    }));

    summaries.push({
      asset,
      bias,
      regime,
      activeTriggers,
      sparkline,
      bandWidth: bw,
      bandWidthMa: bwMa,
    });
  }

  // Priority assets first, then alphabetical for any extras.
  summaries.sort((a, b) => {
    const ai = PRIORITY_ASSETS.indexOf(
      a.asset as (typeof PRIORITY_ASSETS)[number],
    );
    const bi = PRIORITY_ASSETS.indexOf(
      b.asset as (typeof PRIORITY_ASSETS)[number],
    );
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.asset.localeCompare(b.asset);
  });

  return summaries;
}

/** Compute the 4 KPI values from enriched rows. */
function computeKpis(rows: ParsedRow[]): KpiSummary {
  let snapback = 0;
  let pushThrough = 0;
  let filtered = 0;
  for (const r of rows) {
    const isSnap =
      r.regime === "snapback_long" || r.regime === "snapback_short";
    const isPush =
      r.regime === "pushthrough_long" || r.regime === "pushthrough_short";
    if (isSnap) snapback++;
    else if (isPush) pushThrough++;
    // Filtered out: a row that registered a touch but failed MTF, volatility,
    // or entry-timing filters (regime is no_trade but it had a touch event).
    else if (
      r.mtfAlignment === "misaligned" ||
      r.volatility === "fail" ||
      r.entryTiming === "fail"
    ) {
      filtered++;
    }
  }
  return { total: rows.length, snapback, pushThrough, filtered };
}

function EmptyState() {
  return (
    <section
      data-ocid="dashboard.empty_state"
      className="mx-auto flex max-w-[1400px] flex-col items-center justify-center px-4 py-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="flex w-full max-w-xl flex-col items-center text-center"
      >
        <div
          aria-hidden="true"
          className="mb-6 flex size-16 items-center justify-center rounded-xl border border-border bg-card shadow-subtle"
        >
          <Layers className="size-7 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          No dataset loaded
        </h2>
        <p className="mt-2 max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
          Load the shipped TradingView alert-log sample to explore the Brutus
          Playbook classification, or upload your own exported CSV. Educational
          paper-analysis only — not financial advice.
        </p>
        <div className="mt-6 w-full">
          <DatasetLoader />
        </div>
      </motion.div>
    </section>
  );
}

function LoadingState() {
  return (
    <section
      data-ocid="dashboard.loading_state"
      className="mx-auto max-w-[1400px] px-4 py-8"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {["k1", "k2", "k3", "k4"].map((k) => (
          <Skeleton key={k} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {["a1", "a2", "a3", "a4"].map((k) => (
          <Skeleton key={k} className="h-56 rounded-lg" />
        ))}
      </div>
    </section>
  );
}

function WarningsList({
  warnings,
}: { warnings: { column: string; message: string }[] }) {
  if (warnings.length === 0) return null;
  return (
    <Alert
      variant="destructive"
      data-ocid="dashboard.warnings"
      className="mx-auto mt-4 max-w-[1400px]"
    >
      <TriangleAlert className="size-4" aria-hidden="true" />
      <AlertTitle>Parse warnings ({warnings.length})</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-0.5 pl-4 font-mono text-xs">
          {warnings.map((w, i) => (
            <li
              key={`${w.column}-${i}`}
              data-ocid={`dashboard.warning.${i + 1}`}
            >
              <span className="font-semibold">{w.column}</span>: {w.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function LoadedDashboard() {
  const rows = useAppStore((s) => s.rows);
  const warnings = useAppStore((s) => s.warnings);
  const skipped = useAppStore((s) => s.skipped);
  const datasetName = useAppStore((s) => s.datasetName);

  const kpis = useMemo(() => computeKpis(rows), [rows]);
  const assetSummaries = useMemo(() => computeAssetSummaries(rows), [rows]);

  return (
    <section
      data-ocid="dashboard.page"
      className="mx-auto max-w-[1400px] px-4 py-6"
    >
      {/* Header: title + dataset name + loader */}
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            Per-asset bias, regime overview, and live signal counts
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {datasetName ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
              <span
                aria-hidden="true"
                className="size-1.5 animate-signal-pulse rounded-full bg-chart-1"
              />
              <span className="font-mono text-[11px] text-foreground">
                {datasetName}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                · {rows.length} rows
                {skipped > 0 ? ` · ${skipped} skipped` : ""}
              </span>
            </div>
          ) : null}
          <DatasetLoader compact />
        </div>
      </header>

      {/* KPI row */}
      <div
        data-ocid="dashboard.kpi_row"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <KpiCard
          ocid="kpi.total_alerts"
          label="Total Alerts"
          value={kpis.total}
          sublabel="parsed rows"
          icon={Activity}
          accent="neutral"
        />
        <KpiCard
          ocid="kpi.snapback_signals"
          label="Snapback Signals"
          value={kpis.snapback}
          sublabel="RSI divergence"
          icon={ArrowRightCircle}
          accent="snapback"
        />
        <KpiCard
          ocid="kpi.push_through_signals"
          label="Push-Through Signals"
          value={kpis.pushThrough}
          sublabel="momentum"
          icon={Gauge}
          accent="pushthrough"
        />
        <KpiCard
          ocid="kpi.filtered_out"
          label="Filtered Out"
          value={kpis.filtered}
          sublabel="MTF / vol / session"
          icon={Filter}
          accent="filtered"
        />
      </div>

      {/* Warnings */}
      <WarningsList warnings={warnings} />

      {/* Asset cards */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Asset Overview
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {assetSummaries.length} assets
          </span>
        </div>
        {assetSummaries.length === 0 ? (
          <div
            data-ocid="dashboard.no_assets"
            className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center font-mono text-xs text-muted-foreground"
          >
            No assets detected in the loaded dataset.
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            {assetSummaries.map((a, i) => (
              <motion.div
                key={a.asset}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: i * 0.05 }}
              >
                <AssetCard
                  asset={a.asset}
                  bias={a.bias}
                  regime={a.regime}
                  activeTriggers={a.activeTriggers}
                  sparkline={a.sparkline}
                  bandWidth={a.bandWidth}
                  bandWidthMa={a.bandWidthMa}
                  ocid={`asset_card.${a.asset.toLowerCase()}`}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const rows = useAppStore((s) => s.rows);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);

  if (error && rows.length === 0) {
    return (
      <section className="mx-auto max-w-[1400px] px-4 py-10">
        <Alert variant="destructive" data-ocid="dashboard.error_state">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Failed to load dataset</AlertTitle>
          <AlertDescription>
            <p className="font-mono text-xs">{error}</p>
            <div className="mt-3">
              <DatasetLoader />
            </div>
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  if (rows.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  if (isLoading && rows.length === 0) {
    return <LoadingState />;
  }

  return <LoadedDashboard />;
}
