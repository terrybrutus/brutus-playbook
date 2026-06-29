import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ParsedRow } from "@/types";
import { motion } from "motion/react";

/**
 * Brutus Terminal — Regime reasoning panel.
 *
 * Lists which regime conditions matched for the row (first_touch via
 * decisionEvent/mode, touchDepthRatio threshold, RSI divergence vs
 * oversold/overbought, bandWidth expanding vs MA, RSI embedded, snapback /
 * pushThrough flags) with pass/fail chips and the derived RSI value labeled
 * 'derived RSI'. Below the conditions, the raw CSV row (all ParsedRow fields)
 * is displayed in a mono key/value table.
 *
 * Educational paper-analysis only — not financial advice.
 */

interface RegimeReasoningProps {
  row: ParsedRow;
}

interface Condition {
  label: string;
  detail: string;
  pass: boolean;
}

function fmtNum(v: number | null, digits = 3): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

export function RegimeReasoning({ row }: RegimeReasoningProps) {
  const rsi = row.derivedRsi;
  const isFirstTouch =
    row.decisionEvent === "first_touch" || row.mode === "first_touch";
  const bwMa = row.bandWidthMa ?? row.bandWidth;
  const expanding = row.bandWidth > bwMa;

  const conditions: Condition[] = [
    {
      label: "first_touch",
      detail: `decisionEvent="${row.decisionEvent}" · mode="${row.mode}"`,
      pass: isFirstTouch,
    },
    {
      label: "touchDepthRatio ≥ 0.5",
      detail: `${fmtNum(row.touchDepthRatio, 3)} (p90 ${fmtNum(row.touchDepthRatioP90, 3)})`,
      pass: row.touchDepthRatio >= 0.5,
    },
    {
      label: "RSI divergence",
      detail:
        rsi === null
          ? "no RSI"
          : `derived RSI ${rsi.toFixed(1)} vs oversold 30 / overbought 70`,
      pass: rsi !== null && (rsi <= 30 || rsi >= 70),
    },
    {
      label: "bandWidth expanding",
      detail: `bw ${fmtNum(row.bandWidth, 4)} vs MA ${fmtNum(row.bandWidthMa, 4)}`,
      pass: expanding,
    },
    {
      label: "RSI embedded",
      detail:
        rsi === null
          ? "no RSI"
          : `derived RSI ${rsi.toFixed(1)} vs embed 20 / 80`,
      pass: rsi !== null && (rsi <= 20 || rsi >= 80),
    },
    {
      label: "longSnapback",
      detail: row.longSnapback ? "true" : "false",
      pass: row.longSnapback,
    },
    {
      label: "shortSnapback",
      detail: row.shortSnapback ? "true" : "false",
      pass: row.shortSnapback,
    },
    {
      label: "pushThrough",
      detail: `pushThrough=${row.pushThrough} · long=${row.longPushThrough} · short=${row.shortPushThrough}`,
      pass: row.pushThrough || row.longPushThrough || row.shortPushThrough,
    },
  ];

  // Raw row key/value table — all ParsedRow fields.
  const rawEntries: [string, string][] = Object.entries(row)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => [k, formatRawValue(v)]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      data-ocid="signal.detail.regime_reasoning"
      className="rounded-lg border border-border bg-card p-4 shadow-subtle"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-chart-1"
          />
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Regime reasoning
          </h3>
        </div>
        <Badge
          variant="outline"
          data-ocid="signal.detail.regime_reasoning.derived_rsi"
          className="border-chart-1/40 bg-chart-1/10 font-mono text-[10px] tabular-nums text-chart-1"
        >
          derived RSI {rsi === null ? "—" : rsi.toFixed(1)}
        </Badge>
      </div>

      {/* Condition chips */}
      <ul
        data-ocid="signal.detail.regime_reasoning.conditions"
        className="grid gap-1.5 sm:grid-cols-2"
      >
        {conditions.map((c, i) => (
          <li
            key={c.label}
            data-ocid={`signal.detail.regime_reasoning.condition.${i + 1}`}
            className={cn(
              "flex items-start justify-between gap-2 rounded-md border px-2.5 py-1.5",
              c.pass
                ? "border-chart-1/30 bg-chart-1/5"
                : "border-border bg-muted/30",
            )}
          >
            <div className="min-w-0">
              <p
                className={cn(
                  "font-mono text-[11px] font-medium",
                  c.pass ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {c.label}
              </p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {c.detail}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                c.pass
                  ? "bg-chart-1/15 text-chart-1"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {c.pass ? "PASS" : "FAIL"}
            </span>
          </li>
        ))}
      </ul>

      {/* Raw row table */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Raw CSV row
        </p>
        <div
          data-ocid="signal.detail.regime_reasoning.raw_row"
          className="max-h-64 overflow-auto rounded-md border border-border bg-background/40"
        >
          <table className="w-full border-collapse font-mono text-[10px]">
            <tbody>
              {rawEntries.map(([k, v], i) => (
                <tr
                  key={k}
                  data-ocid={`signal.detail.regime_reasoning.raw_row.item.${i + 1}`}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="w-[40%] max-w-[180px] truncate px-2.5 py-1 align-top text-muted-foreground">
                    {k}
                  </td>
                  <td className="px-2.5 py-1 align-top break-words text-foreground/90">
                    {v}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function formatRawValue(v: unknown): string {
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(4);
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v === null) return "null";
  return String(v);
}
