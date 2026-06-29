import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * KPI summary card for the Dashboard KPI row.
 *
 * Brutus Terminal aesthetic: dense, mono numerics, a thin colored accent rail
 * on the left edge keyed to the signal palette (electric green = snapback,
 * amber = push-through, coral = filtered, neutral = totals).
 */

export type KpiAccent = "neutral" | "snapback" | "pushthrough" | "filtered";

const ACCENT_RAIL: Record<KpiAccent, string> = {
  neutral: "bg-muted-foreground/60",
  snapback: "bg-chart-1",
  pushthrough: "bg-chart-2",
  filtered: "bg-chart-3",
};

const ACCENT_GLOW: Record<KpiAccent, string> = {
  neutral: "",
  snapback: "shadow-[0_0_12px_-2px_oklch(var(--chart-1)/0.45)]",
  pushthrough: "shadow-[0_0_12px_-2px_oklch(var(--chart-2)/0.45)]",
  filtered: "shadow-[0_0_12px_-2px_oklch(var(--chart-3)/0.45)]",
};

interface KpiCardProps {
  label: string;
  value: number;
  /** Optional sub-label (e.g. attribution or unit). */
  sublabel?: string;
  icon?: LucideIcon;
  accent?: KpiAccent;
  /** Loading state — renders a skeleton block in place of the value. */
  loading?: boolean;
  /** Deterministic marker id, e.g. "kpi.total_alerts". */
  ocid: string;
}

export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = "neutral",
  loading = false,
  ocid,
}: KpiCardProps) {
  return (
    <Card
      data-ocid={ocid}
      className={cn(
        "relative gap-0 overflow-hidden rounded-lg border-border py-0 shadow-subtle",
        ACCENT_GLOW[accent],
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-[3px]", ACCENT_RAIL[accent])}
      />
      <div className="flex items-start justify-between px-4 pt-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon ? (
          <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        ) : null}
      </div>
      <div className="px-4 pb-3 pt-1">
        {loading ? (
          <div
            className="h-7 w-20 animate-pulse rounded bg-muted"
            aria-label={`${label} loading`}
          />
        ) : (
          <p className="font-mono text-2xl font-semibold tabular-nums leading-none text-foreground">
            {value.toLocaleString()}
          </p>
        )}
        {sublabel ? (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {sublabel}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
