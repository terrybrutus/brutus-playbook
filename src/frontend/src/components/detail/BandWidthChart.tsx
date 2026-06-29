import { assetTfKey } from "@/lib/strategyEngine";
import { cn } from "@/lib/utils";
import type { ParsedRow } from "@/types";
import { motion } from "motion/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Brutus Terminal — BandWidth chart.
 *
 * Recharts line chart of bandWidth + bandWidthMa over candle time for the
 * row's asset/timeframe group, with a ReferenceDot highlighting the current
 * signal point. Uses chart-1 (electric green) for bandWidth and
 * muted-foreground for the MA line.
 *
 * Educational paper-analysis only — not financial advice.
 */

interface BandWidthChartProps {
  row: ParsedRow;
  /** All enriched rows in the current dataset (used to build the group series). */
  rows: ParsedRow[];
}

interface ChartPoint {
  /** Sequential index within the sorted group (oldest → newest). */
  i: number;
  /** Candle time label (HH:mm). */
  label: string;
  bw: number | null;
  ma: number | null;
  /** True when this point is the current signal row. */
  isSignal: boolean;
}

function formatTimeLabel(row: ParsedRow): string {
  const ms = row.candleTimeMs ?? Date.parse(row.timestamp);
  if (!Number.isFinite(ms)) return row.alertId.slice(-4);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return row.alertId.slice(-4);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function BandWidthChart({ row, rows }: BandWidthChartProps) {
  const key = assetTfKey(row.asset, row.timeframe);
  const group = rows
    .filter((r) => assetTfKey(r.asset, r.timeframe) === key)
    .sort((a, b) => (a.candleTimeMs ?? 0) - (b.candleTimeMs ?? 0));

  const data: ChartPoint[] = group.map((r, i) => ({
    i,
    label: formatTimeLabel(r),
    bw: Number.isFinite(r.bandWidth) ? r.bandWidth : null,
    ma: r.bandWidthMa,
    isSignal: r.alertId === row.alertId,
  }));

  const signalPoint = data.find((d) => d.isSignal);
  const hasData = data.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      data-ocid="signal.detail.bandwidth_chart"
      className="rounded-lg border border-border bg-card p-4 shadow-subtle"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-chart-1"
          />
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            BandWidth vs MA
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {row.asset} · {row.timeframe} · MA{" "}
          {row.bandWidthMa === null ? "—" : row.bandWidthMa.toFixed(4)}
        </span>
      </div>

      {!hasData ? (
        <div
          className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          data-ocid="signal.detail.bandwidth_chart.empty_state"
        >
          no bandWidth data for this group
        </div>
      ) : (
        <div
          className="h-[200px] w-full"
          role="img"
          aria-label="BandWidth and bandWidth moving average over candle time"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 6, right: 12, bottom: 4, left: 4 }}
            >
              <CartesianGrid
                stroke="oklch(var(--border))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fill: "oklch(var(--muted-foreground))",
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                }}
                tickLine={false}
                axisLine={{ stroke: "oklch(var(--border))" }}
                minTickGap={24}
              />
              <YAxis
                tick={{
                  fill: "oklch(var(--muted-foreground))",
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                }}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => v.toFixed(4)}
              />
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
                labelStyle={{ color: "oklch(var(--muted-foreground))" }}
                formatter={(value, name) => [
                  value == null ? "—" : Number(value).toFixed(4),
                  name === "bw" ? "bandWidth" : "bandWidth MA",
                ]}
              />
              <Line
                type="monotone"
                dataKey="bw"
                stroke="oklch(var(--chart-1))"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="ma"
                stroke="oklch(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
              {signalPoint && signalPoint.bw !== null ? (
                <ReferenceDot
                  x={signalPoint.label}
                  y={signalPoint.bw}
                  r={5}
                  fill="oklch(var(--chart-1))"
                  stroke="oklch(var(--card))"
                  strokeWidth={2}
                  isFront
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 bg-chart-1" />
          bandWidth
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 bg-muted-foreground" />
          bandWidth MA
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-full bg-chart-1 ring-2 ring-card")}
          />
          this signal
        </span>
      </div>
    </motion.div>
  );
}
