import { cn } from "@/lib/utils";
import type { ParsedRow } from "@/types";
import { motion } from "motion/react";

/**
 * Brutus Terminal — Candle entry-timing timeline.
 *
 * Renders a horizontal 0 → 1 bar with the row's minutesIntoBar marker and
 * threshold lines at 0.5 (early-entry cutoff) and 0.85 (late-confirmation
 * cutoff). Color-coded by the row's entryTiming verdict (pass = electric
 * green, fail = coral).
 *
 * Educational paper-analysis only — not financial advice.
 */

interface CandleTimelineProps {
  row: ParsedRow;
}

const EARLY_THRESHOLD = 0.5;
const LATE_THRESHOLD = 0.85;

export function CandleTimeline({ row }: CandleTimelineProps) {
  const mins = row.minutesIntoBar;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(mins) ? mins : 0));
  const passed = row.entryTiming === "pass";

  const markerTone = passed ? "bg-chart-1" : "bg-chart-3";
  const markerText = passed ? "text-chart-1" : "text-chart-3";
  const verdictLabel = passed ? "PASS" : "FAIL";

  // Position helpers (percentages).
  const markerLeft = `${(clamped * 100).toFixed(2)}%`;
  const earlyLeft = `${(EARLY_THRESHOLD * 100).toFixed(2)}%`;
  const lateLeft = `${(LATE_THRESHOLD * 100).toFixed(2)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      data-ocid="signal.detail.candle_timeline"
      className="rounded-lg border border-border bg-card p-4 shadow-subtle"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full", markerTone)}
          />
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Minutes into bar
          </h3>
        </div>
        <span
          data-ocid="signal.detail.candle_timeline.verdict"
          className={cn(
            "rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            passed
              ? "border-chart-1/40 bg-chart-1/10 text-chart-1"
              : "border-chart-3/40 bg-chart-3/10 text-chart-3",
          )}
        >
          {verdictLabel}
        </span>
      </div>

      {/* The bar */}
      <div
        className="relative h-9 w-full overflow-hidden rounded-md border border-border bg-muted/30"
        role="img"
        aria-label={`minutesIntoBar ${mins.toFixed(3)} of 1.0, entry timing ${verdictLabel.toLowerCase()}`}
      >
        {/* Threshold lines */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-border"
          style={{ left: earlyLeft }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-border"
          style={{ left: lateLeft }}
        />

        {/* Marker */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-y-1 w-1 origin-left rounded-sm"
          style={{ left: markerLeft, background: "oklch(var(--chart-1))" }}
          data-ocid="signal.detail.candle_timeline.marker"
          aria-hidden="true"
        />
        <div
          aria-hidden="true"
          className={cn("absolute inset-y-1 w-1 rounded-sm", markerTone)}
          style={{ left: markerLeft }}
        />
      </div>

      {/* Scale labels */}
      <div className="relative mt-1.5 h-4 font-mono text-[9px] tabular-nums text-muted-foreground">
        <span className="absolute left-0">0.00</span>
        <span className="absolute -translate-x-1/2" style={{ left: earlyLeft }}>
          0.50
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: lateLeft }}>
          0.85
        </span>
        <span className="absolute right-0">1.00</span>
      </div>

      {/* Readout */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            minutesIntoBar
          </p>
          <p
            data-ocid="signal.detail.candle_timeline.value"
            className={cn(
              "font-mono text-sm font-medium tabular-nums",
              markerText,
            )}
          >
            {mins.toFixed(3)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Rule
          </p>
          <p className="font-mono text-[11px] leading-snug text-foreground/85">
            {mins < EARLY_THRESHOLD
              ? "Early: needs touchDepthRatio ≥ p90"
              : mins > LATE_THRESHOLD
                ? "Late: confirmed rejection"
                : "Mid: needs > 0.85 to pass"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
