import { cn } from "@/lib/utils";
import type { ParsedRow } from "@/types";
import { motion } from "motion/react";

/**
 * Brutus Terminal — Exit price ladder.
 *
 * Horizontal price ladder showing entry / target1 (basis) / target2 (opposite
 * band) / stop as color-coded horizontal levels. Green = entry/targets, coral =
 * stop. The Bollinger band context (upper → lower) is shaded behind the
 * levels. Prices render in font-mono with tabular-nums.
 *
 * Educational paper-analysis only — not financial advice.
 */

interface ExitLadderProps {
  row: ParsedRow;
}

interface Level {
  key: "entry" | "target1" | "target2" | "stop";
  label: string;
  value: number;
  tone: "primary" | "destructive";
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 1 : abs >= 10 ? 2 : 4;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function ExitLadder({ row }: ExitLadderProps) {
  const levels: Level[] = [
    { key: "entry", label: "ENTRY", value: row.entry, tone: "primary" },
    {
      key: "target1",
      label: "T1 · BASIS",
      value: row.target1,
      tone: "primary",
    },
    {
      key: "target2",
      label: "T2 · OPPOSITE",
      value: row.target2,
      tone: "primary",
    },
    { key: "stop", label: "STOP", value: row.stop, tone: "destructive" },
  ];

  // Build a vertical price scale from the BB band + stop so the ladder is
  // visually proportional. Pad slightly so labels don't clip.
  const allValues = [
    row.bbUpper,
    row.bbLower,
    row.bbBasis,
    row.entry,
    row.target1,
    row.target2,
    row.stop,
  ].filter((v) => Number.isFinite(v));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const span = max - min || 1;
  const pad = span * 0.08;
  const scaleMin = min - pad;
  const scaleMax = max + pad;
  const scaleSpan = scaleMax - scaleMin || 1;

  const toPct = (v: number) => {
    if (!Number.isFinite(v)) return 50;
    const pct = ((scaleMax - v) / scaleSpan) * 100;
    return Math.max(2, Math.min(98, pct));
  };

  // BB band shaded region (upper → lower).
  const bbTop = toPct(row.bbUpper);
  const bbBottom = toPct(row.bbLower);
  const bandHeight = Math.abs(bbBottom - bbTop);
  const bandTop = Math.min(bbTop, bbBottom);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      data-ocid="signal.detail.exit_ladder"
      className="rounded-lg border border-border bg-card p-4 shadow-subtle"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-chart-3"
          />
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Exit ladder
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          BB {row.bbLength}/{row.stdDev}
        </span>
      </div>

      {/* Ladder canvas */}
      <div
        className="relative w-full"
        style={{ height: 220 }}
        role="img"
        aria-label={`Exit ladder: entry ${formatPrice(row.entry)}, target1 ${formatPrice(row.target1)}, target2 ${formatPrice(row.target2)}, stop ${formatPrice(row.stop)}`}
      >
        {/* BB band shaded context */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 rounded-sm bg-chart-1/5 border-y border-chart-1/20"
          style={{ top: `${bandTop}%`, height: `${bandHeight}%` }}
        />

        {/* BB upper / lower reference lines */}
        <BandLine
          label="BB UPPER"
          value={row.bbUpper}
          top={toPct(row.bbUpper)}
        />
        <BandLine
          label="BB LOWER"
          value={row.bbLower}
          top={toPct(row.bbLower)}
        />

        {/* Exit levels */}
        {levels.map((lvl, i) => (
          <LevelRow
            key={lvl.key}
            level={lvl}
            top={toPct(lvl.value)}
            index={i + 1}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 rounded-sm bg-chart-1/30"
          />
          BB band
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 bg-chart-1" />
          entry / targets
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 bg-chart-3" />
          stop
        </span>
      </div>
    </motion.div>
  );
}

function BandLine({
  label,
  value,
  top,
}: { label: string; value: number; top: number }) {
  return (
    <div
      className="absolute left-0 right-0 flex items-center gap-2"
      style={{ top: `${top}%` }}
      aria-hidden="true"
    >
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[9px] tabular-nums text-muted-foreground/70">
        {formatPrice(value)}
      </span>
    </div>
  );
}

function LevelRow({
  level,
  top,
  index,
}: { level: Level; top: number; index: number }) {
  const isStop = level.tone === "destructive";
  const lineClass = isStop ? "bg-chart-3" : "bg-chart-1";
  const dotClass = isStop ? "bg-chart-3" : "bg-chart-1";
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.28,
        delay: index * 0.06,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="absolute left-0 right-0 flex items-center gap-2"
      style={{ top: `${top}%` }}
      data-ocid={`signal.detail.exit_ladder.level.${index}`}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full ring-2 ring-card", dotClass)}
      />
      <span className={cn("h-0.5 flex-1", lineClass)} />
      <span
        className={cn(
          "rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider tabular-nums",
          isStop
            ? "border-chart-3/40 bg-chart-3/10 text-chart-3"
            : "border-chart-1/40 bg-chart-1/10 text-chart-1",
        )}
      >
        {level.label} {formatPrice(level.value)}
      </span>
    </motion.div>
  );
}
