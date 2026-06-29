import { computeHtfBias } from "@/lib/strategyEngine";
import { cn } from "@/lib/utils";
import type { HtfBias, MtfAlignment, ParsedRow } from "@/types";
import { motion } from "motion/react";

/**
 * Brutus Terminal — Multi-timeframe bias chain.
 *
 * Visualizes the 1h → 15m → trigger TF chain with the bias at each level
 * (long / short / neutral) and the final alignment verdict. Per-TF bias is
 * derived from computeHtfBias over the rows filtered to the same asset.
 *
 * Educational paper-analysis only — not financial advice.
 */

interface MtfBiasChainProps {
  row: ParsedRow;
  rows: ParsedRow[];
}

interface ChainStep {
  tf: string;
  bias: HtfBias;
  /** Whether this step is the row's own timeframe. */
  isCurrent: boolean;
}

const BIAS_STYLE: Record<
  HtfBias,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  long: {
    label: "LONG",
    dot: "bg-chart-1",
    text: "text-chart-1",
    bg: "bg-chart-1/10",
    border: "border-chart-1/40",
  },
  short: {
    label: "SHORT",
    dot: "bg-chart-3",
    text: "text-chart-3",
    bg: "bg-chart-3/10",
    border: "border-chart-3/40",
  },
  neutral: {
    label: "NEUTRAL",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted/40",
    border: "border-border",
  },
  unknown: {
    label: "UNKNOWN",
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground/70",
    bg: "bg-muted/20",
    border: "border-border",
  },
};

const ALIGNMENT_STYLE: Record<
  MtfAlignment,
  { label: string; text: string; bg: string; border: string }
> = {
  aligned: {
    label: "ALIGNED",
    text: "text-chart-1",
    bg: "bg-chart-1/10",
    border: "border-chart-1/40",
  },
  misaligned: {
    label: "MISALIGNED",
    text: "text-chart-3",
    bg: "bg-chart-3/10",
    border: "border-chart-3/40",
  },
  no_htf_data: {
    label: "NO HTF DATA",
    text: "text-muted-foreground",
    bg: "bg-muted/40",
    border: "border-border",
  },
};

function tfToMinutes(tf: string): number {
  const m = tf.match(/^(\d+)([smh])$/);
  if (!m) return 1;
  const n = Number(m[1]);
  if (m[2] === "h") return n * 60;
  if (m[2] === "m") return n;
  return Math.round(n / 60);
}

export function MtfBiasChain({ row, rows }: MtfBiasChainProps) {
  // Filter to the same asset, then derive per-TF bias from computeHtfBias.
  const assetRows = rows.filter((r) => r.asset === row.asset);
  const biasMap = computeHtfBias(assetRows);

  // Determine which timeframes exist for this asset, sorted descending by
  // minutes so the chain reads 1h → 15m → trigger.
  const tfSet = new Set<string>();
  for (const r of assetRows) tfSet.add(r.timeframe);
  const tfs = [...tfSet].sort((a, b) => tfToMinutes(b) - tfToMinutes(a));

  // Build the chain: each TF gets the asset-level bias (computeHtfBias is
  // asset-scoped, so every TF shares the same bias — but we surface the TF
  // list so the user sees the full ladder).
  const chain: ChainStep[] = tfs.map((tf) => ({
    tf,
    bias: biasMap.get(row.asset) ?? "unknown",
    isCurrent: tf === row.timeframe,
  }));

  // If no other TFs exist, fall back to a single current-TF step.
  const steps =
    chain.length > 0
      ? chain
      : [{ tf: row.timeframe, bias: row.htfBias, isCurrent: true }];

  const alignment = row.mtfAlignment;
  const alignStyle = ALIGNMENT_STYLE[alignment];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      data-ocid="signal.detail.mtf_chain"
      className="rounded-lg border border-border bg-card p-4 shadow-subtle"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-muted-foreground"
          />
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            MTF bias chain
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {row.asset}
        </span>
      </div>

      {/* Chain */}
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const style = BIAS_STYLE[step.bias];
          return (
            <div key={`${step.tf}-${i}`} className="flex items-center gap-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.25,
                  delay: i * 0.07,
                  ease: [0.4, 0, 0.2, 1],
                }}
                data-ocid={`signal.detail.mtf_chain.step.${i + 1}`}
                className={cn(
                  "flex min-w-[88px] flex-col gap-1 rounded-md border px-3 py-2",
                  style.border,
                  style.bg,
                  step.isCurrent && "ring-1 ring-ring/40",
                )}
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {step.tf}
                  {step.isCurrent ? " · current" : ""}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn("size-1.5 rounded-full", style.dot)}
                  />
                  <span
                    className={cn(
                      "font-mono text-xs font-semibold tracking-wider",
                      style.text,
                    )}
                  >
                    {style.label}
                  </span>
                </div>
              </motion.div>
              {i < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="font-mono text-muted-foreground/50"
                >
                  →
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Trigger-TF alignment
        </span>
        <span
          data-ocid="signal.detail.mtf_chain.verdict"
          className={cn(
            "rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            alignStyle.border,
            alignStyle.bg,
            alignStyle.text,
          )}
        >
          {alignStyle.label}
        </span>
      </div>
    </motion.div>
  );
}
