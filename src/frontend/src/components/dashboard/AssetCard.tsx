import { BandWidthSparkline } from "@/components/dashboard/BandWidthSparkline";
import type { SparklinePoint } from "@/components/dashboard/BandWidthSparkline";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HtfBias } from "@/types";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

/**
 * Per-asset overview card for the Dashboard asset grid.
 *
 * Shows: asset symbol, current 1h bias (bullish/bearish/neutral with color
 * coding), current bandWidth regime (squeeze/normal/expanded), count of active
 * aligned triggers, and a bandWidth-vs-bandWidth-MA sparkline.
 *
 * Brutus Terminal aesthetic: dense mono numerics, signal-palette accents
 * (electric green = long, coral = short, amber = neutral/active triggers).
 */

export type BandWidthRegime = "squeeze" | "normal" | "expanded";

const BIAS_STYLES: Record<
  HtfBias,
  { label: string; className: string; Icon: typeof ArrowUp }
> = {
  long: {
    label: "BULL",
    className: "border-chart-1/40 bg-chart-1/15 text-chart-1",
    Icon: ArrowUp,
  },
  short: {
    label: "BEAR",
    className: "border-chart-3/40 bg-chart-3/15 text-chart-3",
    Icon: ArrowDown,
  },
  neutral: {
    label: "NEUTRAL",
    className: "border-border bg-muted text-muted-foreground",
    Icon: ArrowRight,
  },
  unknown: {
    label: "NO HTF",
    className: "border-border bg-muted/50 text-muted-foreground/70",
    Icon: ArrowRight,
  },
};

const REGIME_STYLES: Record<BandWidthRegime, string> = {
  squeeze: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  normal: "border-border bg-muted text-muted-foreground",
  expanded: "border-chart-2/40 bg-chart-2/15 text-chart-2",
};

interface AssetCardProps {
  asset: string;
  bias: HtfBias;
  regime: BandWidthRegime;
  activeTriggers: number;
  sparkline: SparklinePoint[];
  /** Latest bandWidth value (for the mono readout). */
  bandWidth: number | null;
  /** Latest bandWidth-MA value (for the mono readout). */
  bandWidthMa: number | null;
  /** Deterministic marker id, e.g. "asset_card.dj30". */
  ocid: string;
}

function fmtBw(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(4);
}

export function AssetCard({
  asset,
  bias,
  regime,
  activeTriggers,
  sparkline,
  bandWidth,
  bandWidthMa,
  ocid,
}: AssetCardProps) {
  const biasStyle = BIAS_STYLES[bias];
  const BiasIcon = biasStyle.Icon;

  return (
    <Card
      data-ocid={ocid}
      className="gap-3 rounded-lg border-border py-4 shadow-subtle transition-smooth hover:border-primary/40"
    >
      {/* Header: asset + bias badge */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            {asset}
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            1h bias
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 font-mono text-[10px] font-semibold",
            biasStyle.className,
          )}
        >
          <BiasIcon className="size-3" aria-hidden="true" />
          {biasStyle.label}
        </Badge>
      </div>

      {/* Meta row: regime + active triggers */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            bandWidth
          </span>
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px] uppercase",
              REGIME_STYLES[regime],
            )}
          >
            {regime}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 rounded-full",
              activeTriggers > 0
                ? "animate-signal-pulse bg-chart-2"
                : "bg-muted-foreground/40",
            )}
          />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            triggers
          </span>
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
            {activeTriggers}
          </span>
        </div>
      </div>

      {/* Mono readout: bw / bw-MA */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border/40 mx-4">
        <div className="bg-card px-2 py-1.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            bw
          </p>
          <p className="font-mono text-xs font-medium tabular-nums text-foreground">
            {fmtBw(bandWidth)}
          </p>
        </div>
        <div className="bg-card px-2 py-1.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            bw-ma
          </p>
          <p className="font-mono text-xs font-medium tabular-nums text-foreground">
            {fmtBw(bandWidthMa)}
          </p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="px-4">
        <BandWidthSparkline
          data={sparkline}
          label={`${asset} bandWidth vs bandWidth-MA`}
          height={48}
        />
      </div>
    </Card>
  );
}
