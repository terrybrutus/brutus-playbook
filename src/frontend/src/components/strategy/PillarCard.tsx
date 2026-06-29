import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

/**
 * Brutus Terminal — Strategy pillar card.
 *
 * Renders one of the five strategy pillars as a dense, mono-accented card with
 * a color-coded rail keyed to the signal palette:
 *   - snapback    -> electric green (chart-1)
 *   - pushthrough -> amber          (chart-2)
 *   - exit        -> coral          (chart-3)
 *   - neutral     -> muted-foreground
 *
 * Each card carries a plain-language explanation and an "encoded rule" callout
 * rendered in a mono code block so the user can read the methodology.
 */

export type PillarAccent = "snapback" | "pushthrough" | "exit" | "neutral";

const ACCENT_RAIL: Record<PillarAccent, string> = {
  snapback: "bg-chart-1",
  pushthrough: "bg-chart-2",
  exit: "bg-chart-3",
  neutral: "bg-muted-foreground/60",
};

const ACCENT_TEXT: Record<PillarAccent, string> = {
  snapback: "text-chart-1",
  pushthrough: "text-chart-2",
  exit: "text-chart-3",
  neutral: "text-muted-foreground",
};

const ACCENT_BADGE: Record<PillarAccent, string> = {
  snapback: "border-chart-1/40 bg-chart-1/10 text-chart-1",
  pushthrough: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  exit: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  neutral: "border-border bg-muted text-muted-foreground",
};

const ACCENT_GLOW: Record<PillarAccent, string> = {
  snapback: "shadow-[0_0_18px_-6px_oklch(var(--chart-1)/0.45)]",
  pushthrough: "shadow-[0_0_18px_-6px_oklch(var(--chart-2)/0.45)]",
  exit: "shadow-[0_0_18px_-6px_oklch(var(--chart-3)/0.45)]",
  neutral: "",
};

export interface PillarBullet {
  /** Short label, e.g. "Snapback". */
  term: string;
  /** Plain-language definition. */
  text: string;
}

export interface PillarRule {
  /** Encoded rule label, e.g. "ENTRY". */
  label: string;
  /** The encoded rule body, rendered verbatim in a mono block. */
  code: string;
}

interface PillarCardProps {
  /** 1-based pillar index for the badge and marker. */
  index: number;
  /** Pillar title, e.g. "Snapback vs Push Through". */
  title: string;
  /** One-line summary shown under the title. */
  summary: string;
  /** Accent palette for the rail + badge. */
  accent: PillarAccent;
  /** Optional icon shown in the header. */
  icon?: LucideIcon;
  /** Plain-language bullet definitions. */
  bullets: PillarBullet[];
  /** Encoded rules displayed in the code callout. */
  rules: PillarRule[];
  /** Deterministic marker id, e.g. "strategy.pillar.1". */
  ocid: string;
}

export function PillarCard({
  index,
  title,
  summary,
  accent,
  icon: Icon,
  bullets,
  rules,
  ocid,
}: PillarCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.32,
        delay: (index - 1) * 0.08,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <Card
        data-ocid={ocid}
        className={cn(
          "relative gap-0 overflow-hidden rounded-lg border-border py-0 shadow-subtle",
          ACCENT_GLOW[accent],
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 w-[3px]",
            ACCENT_RAIL[accent],
          )}
        />

        <CardHeader className="gap-1.5 px-5 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 font-mono text-[10px] tabular-nums",
                  ACCENT_BADGE[accent],
                )}
              >
                {String(index).padStart(2, "0")}
              </Badge>
              {Icon ? (
                <Icon
                  className={cn("size-4 shrink-0", ACCENT_TEXT[accent])}
                  aria-hidden="true"
                />
              ) : null}
              <h3 className="truncate font-display text-base font-semibold tracking-tight text-foreground">
                {title}
              </h3>
            </div>
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            {summary}
          </p>
        </CardHeader>

        <Separator className="bg-border" />

        <CardContent className="px-5 py-4">
          <dl className="space-y-2.5">
            {bullets.map((b) => (
              <div
                key={b.term}
                className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5"
              >
                <dt
                  className={cn(
                    "mt-0.5 font-mono text-[10px] uppercase tracking-wider",
                    ACCENT_TEXT[accent],
                  )}
                >
                  {b.term}
                </dt>
                <dd className="text-sm leading-relaxed text-foreground/90">
                  {b.text}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>

        <Separator className="bg-border" />

        <div className="bg-muted/30 px-5 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", ACCENT_RAIL[accent])}
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Encoded rule
            </span>
          </div>
          <div className="space-y-2">
            {rules.map((r) => (
              <div
                key={r.label}
                className="rounded-md border border-border bg-background/60 px-3 py-2"
              >
                <div
                  className={cn(
                    "mb-1 font-mono text-[10px] uppercase tracking-wider",
                    ACCENT_TEXT[accent],
                  )}
                >
                  {r.label}
                </div>
                <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground/85 whitespace-pre">
                  {r.code}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
