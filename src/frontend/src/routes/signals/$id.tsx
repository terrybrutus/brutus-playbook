import { BandWidthChart } from "@/components/detail/BandWidthChart";
import { CandleTimeline } from "@/components/detail/CandleTimeline";
import { ExitLadder } from "@/components/detail/ExitLadder";
import { MtfBiasChain } from "@/components/detail/MtfBiasChain";
import { RegimeReasoning } from "@/components/detail/RegimeReasoning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import type { ParsedRow, Regime } from "@/types";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  FileSearch,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import type { ComponentType } from "react";

/**
 * Signal detail page.
 *
 * Reads :id from the route, finds the matching row in useAppStore rows by
 * alertId (with a numeric-index fallback), and renders a breadcrumb back-link
 * to /signals, a header with asset/timeframe/regime badge, then the 5 detail
 * sub-components in a data-dense card grid. Handles empty / not-found state
 * with a CTA to load the sample dataset or return to the feed.
 *
 * Educational paper-analysis only — not financial advice.
 */

const REGIME_BADGE: Record<
  Exclude<Regime, "no_trade">,
  {
    label: string;
    short: string;
    tone: "snapback" | "pushthrough";
    direction: "long" | "short";
    Icon: ComponentType<{ className?: string }>;
  }
> = {
  snapback_long: {
    label: "Snapback Long",
    short: "SNAP L",
    tone: "snapback",
    direction: "long",
    Icon: ArrowUpRight,
  },
  snapback_short: {
    label: "Snapback Short",
    short: "SNAP S",
    tone: "snapback",
    direction: "short",
    Icon: ArrowDownRight,
  },
  pushthrough_long: {
    label: "Push-Through Long",
    short: "PUSH L",
    tone: "pushthrough",
    direction: "long",
    Icon: ArrowUpRight,
  },
  pushthrough_short: {
    label: "Push-Through Short",
    short: "PUSH S",
    tone: "pushthrough",
    direction: "short",
    Icon: ArrowDownRight,
  },
};

function findRow(rows: ParsedRow[], id: string): ParsedRow | undefined {
  // Primary: match by alertId.
  const byId = rows.find((r) => r.alertId === id);
  if (byId) return byId;
  // Fallback: numeric index.
  const n = Number(id);
  if (Number.isInteger(n) && n >= 0 && n < rows.length) return rows[n];
  return undefined;
}

export function SignalDetailPage() {
  const { id } = useParams({ from: "/signals/$id" });
  const rows = useAppStore((s) => s.rows);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const loadSampleDataset = useAppStore((s) => s.loadSampleDataset);

  const row = findRow(rows, id);

  // Empty dataset state.
  if (rows.length === 0 && !isLoading && !error) {
    return (
      <EmptyState
        title="No dataset loaded"
        message="Load the sample TradingView alert log to inspect a signal."
        onLoadSample={loadSampleDataset}
      />
    );
  }

  if (isLoading) {
    return (
      <section
        data-ocid="signal.detail.loading_state"
        className="mx-auto max-w-[1400px] px-4 py-10"
      >
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Loading dataset…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        data-ocid="signal.detail.error_state"
        className="mx-auto max-w-[1400px] px-4 py-10"
      >
        <p className="font-mono text-xs uppercase tracking-wider text-destructive">
          Failed to load dataset
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{error}</p>
      </section>
    );
  }

  // Not found.
  if (!row) {
    return (
      <EmptyState
        title="Signal not found"
        message={`No signal matches id "${id}". It may have been filtered out or the dataset changed.`}
        backToFeed
      />
    );
  }

  const config = REGIME_BADGE[row.regime as Exclude<Regime, "no_trade">];
  const isSnapback = config?.tone === "snapback";
  const accentText = isSnapback ? "text-chart-1" : "text-chart-2";
  const accentBg = isSnapback ? "bg-chart-1/10" : "bg-chart-2/10";
  const accentBorder = isSnapback ? "border-chart-1/40" : "border-chart-2/40";

  return (
    <section
      data-ocid="signal.detail.page"
      className="mx-auto max-w-[1400px] px-4 py-6"
    >
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex items-center gap-1 font-mono text-[11px] text-muted-foreground"
      >
        <Link
          to="/signals"
          data-ocid="signal.detail.breadcrumb.signals"
          className="transition-smooth hover:text-foreground"
        >
          Signals
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="truncate text-foreground">
          {row.asset} · {row.timeframe}
        </span>
      </nav>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="mb-6 flex flex-wrap items-end justify-between gap-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          {config ? (
            <Badge
              variant="outline"
              data-ocid="signal.detail.regime_badge"
              className={`gap-1 border font-mono text-[10px] uppercase tracking-wider ${accentBorder} ${accentBg} ${accentText}`}
            >
              <config.Icon className="size-3" aria-hidden="true" />
              {config.short}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              data-ocid="signal.detail.regime_badge"
              className="border-border bg-muted font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              NO TRADE
            </Badge>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-foreground">
              {row.asset}
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {row.timeframe} · {row.ticker}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="rounded-md border border-border bg-card px-2 py-1">
            alert {row.alertId.slice(-8)}
          </span>
        </div>
      </motion.header>

      {/* Detail grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RegimeReasoning row={row} />
        <MtfBiasChain row={row} rows={rows} />
        <BandWidthChart row={row} rows={rows} />
        <CandleTimeline row={row} />
        <ExitLadder row={row} />
      </div>
    </section>
  );
}

interface EmptyStateProps {
  title: string;
  message: string;
  onLoadSample?: () => void;
  backToFeed?: boolean;
}

function EmptyState({
  title,
  message,
  onLoadSample,
  backToFeed,
}: EmptyStateProps) {
  return (
    <section
      data-ocid="signal.detail.empty_state"
      className="mx-auto flex max-w-[1400px] flex-col items-center justify-center gap-4 px-4 py-20 text-center"
    >
      <FileSearch className="size-8 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-display text-base font-semibold text-foreground">
          {title}
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {message}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onLoadSample ? (
          <Button
            data-ocid="signal.detail.load_sample_button"
            onClick={onLoadSample}
            variant="default"
            size="sm"
          >
            <Upload className="size-4" aria-hidden="true" />
            Load sample dataset
          </Button>
        ) : null}
        {backToFeed ? (
          <Button
            data-ocid="signal.detail.back_to_feed_button"
            asChild
            variant="outline"
            size="sm"
          >
            <Link to="/signals">Back to feed</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
