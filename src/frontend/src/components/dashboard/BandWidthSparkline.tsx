import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Inline bandWidth-vs-bandWidth-MA sparkline for an asset card.
 *
 * Renders a compact dual-series chart: bandWidth as a filled area, bandWidth-MA
 * as a thin reference line. Designed to fit inside an AssetCard footer with no
 * axes labels and a minimal tooltip. Uses the chart-1 (electric green) token for
 * the bandWidth series and the muted-foreground token for the MA line.
 */

export interface SparklinePoint {
  /** Sequential index (oldest -> newest). */
  i: number;
  /** bandWidth value at this candle. */
  bw: number | null;
  /** bandWidth moving-average value at this candle. */
  ma: number | null;
}

interface BandWidthSparklineProps {
  data: SparklinePoint[];
  /** Accessible label summarizing the series. */
  label: string;
  /** Height in px (default 48). */
  height?: number;
}

export function BandWidthSparkline({
  data,
  label,
  height = 48,
}: BandWidthSparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
        style={{ height }}
        aria-label={`${label} — no data`}
      >
        no bandWidth data
      </div>
    );
  }

  return (
    <div
      className="w-full overflow-hidden rounded-md border border-border bg-background/40"
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
        >
          <defs>
            <linearGradient id="bwFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="oklch(var(--chart-1))"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="oklch(var(--chart-1))"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide domain={["dataMin", "dataMax"]} />
          <YAxis hide domain={["auto", "auto"]} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: "oklch(var(--border))", strokeWidth: 1 }}
            contentStyle={{
              background: "oklch(var(--popover))",
              border: "1px solid oklch(var(--border))",
              borderRadius: "calc(var(--radius))",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              padding: "4px 6px",
              color: "oklch(var(--popover-foreground))",
            }}
            labelStyle={{ display: "none" }}
            formatter={(value) => [
              value == null ? "—" : Number(value).toFixed(4),
              "",
            ]}
          />
          <Area
            type="monotone"
            dataKey="bw"
            stroke="oklch(var(--chart-1))"
            strokeWidth={1.25}
            fill="url(#bwFill)"
            isAnimationActive={false}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="ma"
            stroke="oklch(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="3 2"
            isAnimationActive={false}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
