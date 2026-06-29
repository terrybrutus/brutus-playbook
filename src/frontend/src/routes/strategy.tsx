import { PillarCard } from "@/components/strategy/PillarCard";
import {
  Activity,
  ArrowLeftRight,
  Clock,
  Gauge,
  Layers,
  Target,
} from "lucide-react";
import { motion } from "motion/react";

/**
 * Strategy Explainer — Brutus Playbook.
 *
 * Static educational content walking through the five strategy pillars in plain
 * language, with the encoded rules displayed alongside each pillar in a
 * mono code callout. Educational paper-analysis only — not financial advice.
 *
 * Accent mapping:
 *   Pillar 1 (Snapback vs Push Through) -> snapback / pushthrough split
 *   Pillar 2 (MTF Alignment)            -> neutral
 *   Pillar 3 (Minutes Into Bar)         -> neutral
 *   Pillar 4 (Volatility Filtering)     -> pushthrough
 *   Pillar 5 (Dynamic Exits & RSI)      -> exit (coral)
 */

const PILLARS = [
  {
    index: 1,
    title: "Snapback vs Push Through",
    summary:
      "Two opposing regimes. Snapback = mean reversion off the band. Push Through = momentum continuation through the band.",
    accent: "snapback" as const,
    icon: ArrowLeftRight,
    bullets: [
      {
        term: "Snapback",
        text: "Mean reversion. A first_touch with a high touchDepthRatio, confirmed by RSI divergence — price makes a new deep touch while RSI prints a higher low (longs) or lower high (shorts).",
      },
      {
        term: "Push Through",
        text: "Momentum continuation. Price pushes through the band, bandWidth is rapidly expanding, and RSI is embedded above 80 (longs) or below 20 (shorts).",
      },
    ],
    rules: [
      {
        label: "SNAPBACK",
        code: `regime = first_touch
  AND touchDepthRatio >= p90
  AND longSnapback  AND rsi <= oversold   -> snapback_long
  AND shortSnapback AND rsi >= overbought -> snapback_short`,
      },
      {
        label: "PUSH THROUGH",
        code: `regime = pushThrough
  AND bandWidth > bandWidthMa (expanding)
  AND longPushThrough  AND rsi >= embedHigh -> pushthrough_long
  AND shortPushThrough AND rsi <= embedLow  -> pushthrough_short`,
      },
    ],
  },
  {
    index: 2,
    title: "Multi-Timeframe Alignment",
    summary:
      "15m and 1h set directional bias. Trigger timeframes (1m/3m/5m) wait for a touch AGAINST the higher-TF trend.",
    accent: "neutral" as const,
    icon: Layers,
    bullets: [
      {
        term: "HTF bias",
        text: "If 1h is riding the upper band (push through), only Long setups are allowed on lower timeframes. If riding the lower band, only Short setups.",
      },
      {
        term: "Trigger TF",
        text: "1m/3m/5m wait for newLongTouch or newShortTouch AGAINST the 1h trend direction. A long-biased 1h wants a short touch on the trigger TF; a short-biased 1h wants a long touch.",
      },
    ],
    rules: [
      {
        label: "MTF",
        code: `htfBias(asset) =
  count(pushthrough_long)  > count(pushthrough_short) -> long
  count(pushthrough_short) > count(pushthrough_long)  -> short
  else                                                    -> neutral

aligned = triggerTf AND
  (htfBias=long  AND newShortTouch) OR
  (htfBias=short AND newLongTouch)`,
      },
    ],
  },
  {
    index: 3,
    title: "Minutes Into Bar & Touch Depth",
    summary:
      "Early entries need an extreme touch. Otherwise the candle must prove it is rejecting the band.",
    accent: "neutral" as const,
    icon: Clock,
    bullets: [
      {
        term: "Early entry",
        text: "If minutesIntoBar < 0.5, the entry is only allowed when touchDepthRatio is at or above the 90th percentile of its historical distribution.",
      },
      {
        term: "Late confirmation",
        text: "Otherwise require minutesIntoBar > 0.85 to confirm the candle is actually rejecting the band rather than probing it.",
      },
    ],
    rules: [
      {
        label: "ENTRY TIMING",
        code: `if minutesIntoBar < 0.5:
  pass  IF touchDepthRatio >= p90
  fail  otherwise
else:
  pass  IF minutesIntoBar > 0.85
  fail  otherwise`,
      },
    ],
  },
  {
    index: 4,
    title: "Volatility Filtering",
    summary:
      "Snapback needs an expanded band. Push-through needs a squeeze breakout.",
    accent: "pushthrough" as const,
    icon: Gauge,
    bullets: [
      {
        term: "Snapback",
        text: "Snapback trades are only taken when bandWidth is ABOVE its moving average — the band is wide enough to mean-revert.",
      },
      {
        term: "Push Through",
        text: "Push-through trades are only taken when bandWidth is EXPANDING from a below-average state — a Bollinger Squeeze breakout.",
      },
    ],
    rules: [
      {
        label: "VOLATILITY",
        code: `snapback:     bandWidth > bandWidthMa
pushthrough:  bandWidth >= bandWidthMa
              (expanding from a below-average squeeze)`,
      },
    ],
  },
  {
    index: 5,
    title: "Dynamic Exits & RSI Matching",
    summary:
      "Targets roll to basis then the opposite band. Stops sit beyond the deepest touch. RSI length matches BB length.",
    accent: "exit" as const,
    icon: Target,
    bullets: [
      {
        term: "Targets",
        text: "Lower-band entry: target1 = basis, target2 = opposite upper band. Upper-band entry: target1 = basis, target2 = opposite lower band.",
      },
      {
        term: "Stop",
        text: "Stop = deepest touchDepth in the current touch sequence (lower-band entry: entry − touchDepth; upper-band entry: entry + touchDepth).",
      },
      {
        term: "RSI length",
        text: "RSI length is matched to the BB length (9), not the default 14, so both indicators share the same reaction window.",
      },
    ],
    rules: [
      {
        label: "EXITS",
        code: `long entry  (bbLower):
  target1 = bbBasis
  target2 = bbUpper
  stop    = bbLower - touchDepth
short entry (bbUpper):
  target1 = bbBasis
  target2 = bbLower
  stop    = bbUpper + touchDepth

rsiPeriod = bbLength = 9   (NOT 14)`,
      },
    ],
  },
];

const PIPELINE_STEPS = [
  "Parse CSV → JSON.parse(Description)",
  "Per asset/timeframe: RSI(9), bandWidth MA, touchDepthRatio p90",
  "Classify regime (snapback / push-through / no-trade)",
  "Compute 1h bias → MTF alignment on trigger TFs",
  "Apply entry-timing + volatility filters",
  "Compute dynamic exits (basis → opposite band)",
  "Tag session context (asian / overlap / us_open)",
];

export function StrategyPage() {
  return (
    <section
      data-ocid="strategy.page"
      className="mx-auto max-w-[1400px] px-4 py-8"
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <Activity className="size-3 text-chart-1" aria-hidden="true" />
          <span>Brutus Playbook</span>
          <span aria-hidden="true">/</span>
          <span className="text-foreground">Strategy explainer</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
          The five pillars
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A plain-language walkthrough of the methodology the engine encodes.
          Each pillar pairs an explanation with the exact rule the classifier
          applies. Educational paper-analysis only — not financial advice.
        </p>
      </motion.header>

      {/* Pipeline overview */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
        className="mb-8 rounded-lg border border-border bg-card shadow-subtle"
        data-ocid="strategy.pipeline"
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <span
            aria-hidden="true"
            className="size-1.5 animate-signal-pulse rounded-full bg-chart-1"
          />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Pipeline
          </span>
        </div>
        <ol className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {PIPELINE_STEPS.map((step, i) => (
            <li
              key={step}
              data-ocid={`strategy.pipeline.step.${i + 1}`}
              className="bg-card px-4 py-3"
            >
              <div className="mb-1 font-mono text-[10px] tabular-nums text-chart-1">
                {String(i + 1).padStart(2, "0")}
              </div>
              <p className="font-mono text-[11px] leading-snug text-foreground/85">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </motion.div>

      {/* Pillar grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {PILLARS.map((p) => (
          <PillarCard
            key={p.index}
            index={p.index}
            title={p.title}
            summary={p.summary}
            accent={p.accent}
            icon={p.icon}
            bullets={p.bullets}
            rules={p.rules}
            ocid={`strategy.pillar.${p.index}`}
          />
        ))}

        {/* Disclaimer tile fills the 6th grid slot */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.32, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col justify-center rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-5"
          data-ocid="strategy.disclaimer"
        >
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-destructive">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-destructive"
            />
            Educational only
          </div>
          <p className="text-sm leading-relaxed text-foreground/85">
            This page describes a paper-analysis methodology applied to a static
            CSV of historical alerts. It is not financial advice, is not
            connected to any exchange, and past signals do not predict future
            results.
          </p>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            RSI length = BB length = 9 · basis = (upper + lower) / 2 · derived
            RSI computed from close per asset/timeframe.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
