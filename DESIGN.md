# Design Brief — Brutus Terminal

## Direction
Dark, data-dense trading dashboard ("Brutus Terminal"). Monochrome Sharp base calibrated with a signal palette for trade setups. Educational paper-analysis only — not financial advice.

## Tone
Utilitarian, precise, calm under information load. Reads like a Bloomberg/TradingView terminal, not a marketing site. Restraint over decoration; numbers always legible.

## Differentiation
A calibrated signal palette (electric green / amber / coral) layered on a near-monochrome shell, with mono numerics everywhere prices, RSI, tickers, percentiles appear. Sharp 0.375rem radii and terminal-grade shadows sell the trader aesthetic.

## Color Palette
| Token | Light OKLCH | Dark OKLCH | Role |
|---|---|---|---|
| background | 0.98 0.005 240 | 0.13 0.005 240 | app shell |
| foreground | 0.16 0.005 240 | 0.92 0.005 240 | primary text |
| card | 1.0 0.005 240 | 0.17 0.008 240 | surfaces / panels |
| primary | 0.55 0.21 145 | 0.78 0.21 145 | electric green — snapback / bullish / live |
| accent | 0.55 0.16 75 | 0.78 0.16 75 | amber — caution / push-through / active |
| destructive | 0.55 0.22 25 | 0.62 0.22 25 | coral — stops / filtered-out / bearish |
| muted | 0.94 0.008 240 | 0.21 0.008 240 | recessed panels |
| muted-foreground | 0.45 0.008 240 | 0.58 0.005 240 | secondary text |
| border | 0.88 0.008 240 | 0.26 0.008 240 | hairline dividers |
| chart-4 | 0.6 0.15 200 | 0.75 0.15 200 | cyan — MTF bias |
| chart-5 | 0.5 0.22 300 | 0.65 0.22 300 | violet — volatility |

## Typography
- Display: Space Grotesk — nav, page titles, KPI labels.
- Body: Figtree — paragraphs, controls, explainer prose.
- Mono: Geist Mono — ALL numerics (prices, RSI, tickers, percentiles, timestamps) with `tabular-nums`.

## Elevation & Depth
- `shadow-subtle`: resting cards, KPI tiles, nav.
- `shadow-elevated`: signal cards on hover, signal-detail hero, popovers.
- Hairline 1px borders (`border`) over glow. Depth via layering (background → card → muted), not gradients.

## Structural Zones
| Zone | Surface | Border | Treatment |
|---|---|---|---|
| Top nav | bg-card | border-b | sticky, `shadow-subtle`, mono brand wordmark |
| Disclaimer banner | bg-accent/10 | border-b | persistent on every page, accent text |
| Page content | bg-background | none | alternating `bg-muted/30` section bands |
| KPI / asset cards | bg-card | border | `shadow-subtle`, hover `shadow-elevated` |
| Signals feed | bg-card | border | `animate-fade-in` on entrance, hover lift |
| Signal detail hero | bg-card | border | `shadow-elevated`, mono price ladder |
| Settings forms | bg-card | border | grouped fieldsets, muted labels |
| Strategy explainer | bg-muted/30 | border-t | editorial long-form, prose-lg |
| Footer | bg-muted/40 | border-t | muted-foreground, fine print |

## Spacing & Rhythm
- Container max 1400px, centered, 2rem gutter.
- Section vertical rhythm: 1.5rem (mobile) / 2.5rem (desktop).
- Card padding: 1rem (KPI) / 1.25rem (signal) / 1.5rem (detail hero).
- Tight 0.375rem radii everywhere; full radius only on status dots.

## Component Patterns
- KPI tiles: mono value, Space Grotesk label, delta in primary/destructive.
- Signal cards: regime chip (primary/accent/destructive), mono entry/target1/target2/stop ladder, RSI + touchDepthRatio percentile row, MTF/volatility/session filter pills.
- Live signal dot: 8px circle, `animate-signal-pulse`, colored by regime.
- Filter bar: pill toggles + cmdk-style sort, state in URL search params.
- Asset cards: 1h bias chip, bandWidth regime tag, bandWidth-vs-MA sparkline (Recharts), active-trigger count.

## Motion
- `signal-pulse` 1.6s infinite on live dots (opacity + scale).
- `fade-in` 0.28s on feed cards entering (translateY 4px → 0).
- Hover lift: signal cards rise 2px + swap `shadow-subtle` → `shadow-elevated` over 0.2s.
- No bouncy / spring easings. `cubic-bezier(0.4, 0, 0.2, 1)` everywhere.

## Constraints
- No raw hex / rgb / named colors in components — OKLCH tokens only.
- No glow or neon shadows.
- No Raw data explorer table, no Win-rate backtesting module (out of v1 scope).
- Educational disclaimer must appear on every page.

## Signature Detail
Mono price ladder in every signal card and the signal-detail hero: entry / target1 / target2 / stop stacked in Geist Mono with tabular-nums, each line color-coded (primary → primary → accent → destructive) and capped by a thin `border-b` divider. It is the single most recognizable Brutus Terminal motif.
