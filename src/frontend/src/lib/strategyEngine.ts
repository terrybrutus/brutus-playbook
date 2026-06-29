import type { SignalType } from "@/backend";
import type {
  AppSettings,
  AssetTfKey,
  EntryTimingVerdict,
  HtfBias,
  MtfAlignment,
  ParsedRow,
  Regime,
  SessionLabel,
  VolatilityVerdict,
} from "@/types";

/**
 * Brutus Playbook strategy engine.
 *
 * All computations are educational paper-analysis only — not financial advice.
 * RSI is computed from close price per asset/timeframe (length matched to BB
 * length, default 9). Bollinger basis is derived as (upper + lower) / 2.
 */

// ---------------------------------------------------------------------------
// Indicator computations
// ---------------------------------------------------------------------------

/**
 * Compute a Wilder-style RSI series from a close-price array.
 * Returns an array aligned to the input (nulls until enough data).
 */
export function computeRsiSeries(
  closes: number[],
  period: number,
): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/** Simple moving average over a window. */
function sma(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

/** Percentile (linear interpolation) of a numeric array. */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

function groupByAssetTf(rows: ParsedRow[]): Map<string, ParsedRow[]> {
  const map = new Map<string, ParsedRow[]>();
  for (const r of rows) {
    const key = `${r.asset}|${r.timeframe}`;
    const arr = map.get(key);
    if (arr) arr.push(r);
    else map.set(key, [r]);
  }
  return map;
}

/** Sort a group by candle time ascending for indicator math. */
function sortByCandleTime(rows: ParsedRow[]): ParsedRow[] {
  return [...rows].sort((a, b) => {
    const ta = a.candleTimeMs ?? 0;
    const tb = b.candleTimeMs ?? 0;
    return ta - tb;
  });
}

// ---------------------------------------------------------------------------
// Regime classification
// ---------------------------------------------------------------------------

function isHigherTf(tf: string): boolean {
  const m = tf.match(/^(\d+)([smh])$/);
  if (!m) return false;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit === "h") return true;
  if (unit === "m") return n >= 15;
  return false;
}

function tfToMinutes(tf: string): number {
  const m = tf.match(/^(\d+)([smh])$/);
  if (!m) return 1;
  const n = Number(m[1]);
  if (m[2] === "h") return n * 60;
  if (m[2] === "m") return n;
  return Math.round(n / 60);
}

/**
 * Classify a single row into a regime.
 * Uses touchDepthRatio, RSI divergence, bandWidth expansion, and the
 * longSnapback/shortSnapback/pushThrough flags as supporting evidence.
 */
function classifyRow(
  row: ParsedRow,
  rsi: number | null,
  bandWidthMa: number | null,
  settings: AppSettings,
): Regime {
  const isFirstTouch =
    row.decisionEvent === "first_touch" || row.mode === "first_touch";
  const rsiVal = rsi ?? 0;
  const bw = row.bandWidth;
  const bwMa = bandWidthMa ?? bw;
  const expanding = bw > bwMa;

  // Push-through: bandWidth rapidly expanding AND RSI embedded.
  if (row.pushThrough || row.longPushThrough || row.shortPushThrough) {
    if (expanding) {
      if (row.longPushThrough && rsiVal >= settings.rsiEmbedHigh)
        return "pushthrough_long";
      if (row.shortPushThrough && rsiVal <= settings.rsiEmbedLow)
        return "pushthrough_short";
    }
  }

  // Snapback: first_touch with high touchDepthRatio AND RSI divergence.
  if (isFirstTouch) {
    // RSI divergence proxy: snapback flag set + RSI in oversold/overbought zone.
    if (row.longSnapback && rsiVal <= settings.rsiOversold)
      return "snapback_long";
    if (row.shortSnapback && rsiVal >= settings.rsiOverbought)
      return "snapback_short";
    // Fallback: snapback flag alone with high touchDepthRatio.
    if (row.longSnapback && row.touchDepthRatio >= 0.5) return "snapback_long";
    if (row.shortSnapback && row.touchDepthRatio >= 0.5)
      return "snapback_short";
  }

  return "no_trade";
}

function regimeToSignalType(r: Regime): SignalType {
  switch (r) {
    case "snapback_long":
      return "snapbackLong" as SignalType;
    case "snapback_short":
      return "snapbackShort" as SignalType;
    case "pushthrough_long":
      return "pushThroughLong" as SignalType;
    case "pushthrough_short":
      return "pushThroughShort" as SignalType;
    default:
      return "noTrade" as SignalType;
  }
}

// ---------------------------------------------------------------------------
// Multi-timeframe alignment
// ---------------------------------------------------------------------------

/**
 * Compute the higher-TF directional bias per asset from push-through regimes.
 * 1h riding upper band -> long bias; riding lower band -> short bias.
 */
export function computeHtfBias(rows: ParsedRow[]): Map<string, HtfBias> {
  const byAsset = new Map<string, ParsedRow[]>();
  for (const r of rows) {
    if (!isHigherTf(r.timeframe)) continue;
    const arr = byAsset.get(r.asset) ?? [];
    arr.push(r);
    byAsset.set(r.asset, arr);
  }
  const biasMap = new Map<string, HtfBias>();
  for (const [asset, group] of byAsset) {
    let longHits = 0;
    let shortHits = 0;
    for (const r of group) {
      if (r.regime === "pushthrough_long") longHits++;
      if (r.regime === "pushthrough_short") shortHits++;
    }
    if (longHits > shortHits && longHits > 0) biasMap.set(asset, "long");
    else if (shortHits > longHits && shortHits > 0) biasMap.set(asset, "short");
    else biasMap.set(asset, "neutral");
  }
  return biasMap;
}

function computeMtfAlignment(row: ParsedRow, htfBias: HtfBias): MtfAlignment {
  if (htfBias === "unknown" || htfBias === "neutral") return "no_htf_data";
  // Trigger TFs (1m/3m/5m) must register newLongTouch/newShortTouch AGAINST
  // the 1h trend direction to qualify.
  const isTriggerTf = tfToMinutes(row.timeframe) <= 5;
  if (!isTriggerTf) return "no_htf_data";
  if (htfBias === "long" && row.newShortTouch) return "aligned";
  if (htfBias === "short" && row.newLongTouch) return "aligned";
  return "misaligned";
}

// ---------------------------------------------------------------------------
// Entry timing filter
// ---------------------------------------------------------------------------

function applyEntryTiming(
  row: ParsedRow,
  p90: number | null,
  settings: AppSettings,
): EntryTimingVerdict {
  if (row.minutesIntoBar < 0.5) {
    // Early: only allow if touchDepthRatio >= 90th percentile.
    const threshold = p90 ?? settings.minBandWidthRatio;
    return row.touchDepthRatio >= threshold ? "pass" : "fail";
  }
  // Otherwise require minutesIntoBar > 0.85.
  return row.minutesIntoBar > settings.minMinutesIntoBar ? "pass" : "fail";
}

// ---------------------------------------------------------------------------
// Volatility filter
// ---------------------------------------------------------------------------

function applyVolatility(
  row: ParsedRow,
  bandWidthMa: number | null,
  prevBandWidth: number | null,
  prevBandWidthMa: number | null,
): VolatilityVerdict {
  const bwMa = bandWidthMa ?? row.bandWidth;
  if (row.regime === "snapback_long" || row.regime === "snapback_short") {
    // Snapback / RSI-divergence reversal: bandWidth must be ABOVE its MA.
    return row.bandWidth > bwMa ? "pass" : "fail";
  }
  if (row.regime === "pushthrough_long" || row.regime === "pushthrough_short") {
    // Push-through momentum: bandWidth EXPANDING from a BELOW-average state
    // (squeeze breakout). We require the PREVIOUS bandWidth to have been
    // below its MA and the current one to be at or above its MA — i.e. a
    // cross up out of a squeeze.
    const prevBw = prevBandWidth ?? row.bandWidth;
    const prevBwMa = prevBandWidthMa ?? bwMa;
    const wasInSqueeze = prevBw < prevBwMa;
    const nowExpanded = row.bandWidth >= bwMa;
    return wasInSqueeze && nowExpanded ? "pass" : "fail";
  }
  return "n/a";
}

// ---------------------------------------------------------------------------
// Dynamic exits
// ---------------------------------------------------------------------------

function computeExits(row: ParsedRow): {
  entry: number;
  target1: number;
  target2: number;
  stop: number;
} {
  const basis = row.bbBasis;
  if (row.regime === "snapback_long" || row.regime === "pushthrough_long") {
    // Lower-band entry: target1 = basis, target2 = opposite upper band.
    return {
      entry: row.bbLower,
      target1: basis,
      target2: row.bbUpper,
      stop: row.bbLower - row.touchDepth,
    };
  }
  if (row.regime === "snapback_short" || row.regime === "pushthrough_short") {
    // Upper-band entry: target1 = basis, target2 = opposite lower band.
    return {
      entry: row.bbUpper,
      target1: basis,
      target2: row.bbLower,
      stop: row.bbUpper + row.touchDepth,
    };
  }
  return { entry: row.entry, target1: basis, target2: 0, stop: row.stop };
}

// ---------------------------------------------------------------------------
// Session context
// ---------------------------------------------------------------------------

function parseSessionWindow(
  start: string,
  end: string,
): {
  startMin: number;
  endMin: number;
} {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  return { startMin: toMin(start), endMin: toMin(end) };
}

function computeSession(
  row: ParsedRow,
  settings: AppSettings,
): { label: SessionLabel; favored: "snapback" | "push_through" | "neutral" } {
  // Use the inSession flag from the CSV if present; if the flag is false,
  // fall back to computing from the timestamp against the configured window.
  // Only return off_hours if BOTH the flag is false AND the timestamp is
  // outside the configured session window.
  const ms = row.candleTimeMs ?? Date.parse(row.timestamp);
  if (!Number.isFinite(ms)) {
    return { label: "off_hours", favored: "neutral" };
  }
  const d = new Date(ms);
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  const { startMin, endMin } = parseSessionWindow(
    settings.sessionStart,
    settings.sessionEnd,
  );
  const inWindow = mins >= startMin && mins <= endMin;

  if (!row.inSession && !inWindow) {
    return { label: "off_hours", favored: "neutral" };
  }
  // Asian/European overlap favors Snapback; US open favors Push Through.
  const usOpenStart = 13 * 60; // 13:00 UTC ~ US open
  if (mins >= usOpenStart) return { label: "us_open", favored: "push_through" };
  if (mins >= 7 * 60) return { label: "overlap", favored: "snapback" };
  return { label: "asian", favored: "snapback" };
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Run the full strategy pipeline over parsed rows.
 * Mutates rows in place with computed indicators, regime, filters, and exits.
 */
export function runStrategyPipeline(
  rows: ParsedRow[],
  settings: AppSettings,
): ParsedRow[] {
  // 1. Per asset/timeframe: compute RSI, bandWidth MA, touchDepthRatio p90.
  const groups = groupByAssetTf(rows);
  const p90ByGroup = new Map<string, number>();
  const rsiByGroup = new Map<string, (number | null)[]>();
  const bwMaByGroup = new Map<string, (number | null)[]>();

  for (const [key, group] of groups) {
    const sorted = sortByCandleTime(group);
    const closes = sorted.map((r) => r.close);
    const rsi = computeRsiSeries(closes, settings.rsiPeriod);
    const bw = sorted.map((r) => r.bandWidth);
    const bwMa = sma(bw, settings.bandWidthMaWindow);
    const tdr = sorted.map((r) => r.touchDepthRatio);
    const p90 = percentile(
      tdr.filter((v) => v > 0),
      settings.touchDepthRatioPercentile,
    );

    rsiByGroup.set(key, rsi);
    bwMaByGroup.set(key, bwMa);
    p90ByGroup.set(key, p90);

    // Map computed values back onto the sorted rows (which are the same
    // object references as the original group).
    sorted.forEach((r, i) => {
      r.derivedRsi = rsi[i];
      r.bandWidthMa = bwMa[i];
      r.touchDepthRatioP90 = p90;
    });
  }

  // 2. Classify regime per row.
  for (const row of rows) {
    row.regime = classifyRow(row, row.derivedRsi, row.bandWidthMa, settings);
    row.signalType = regimeToSignalType(row.regime);
  }

  // 3. Compute higher-TF bias and MTF alignment.
  const htfBiasMap = computeHtfBias(rows);
  for (const row of rows) {
    const bias = htfBiasMap.get(row.asset) ?? "unknown";
    row.htfBias = bias;
    row.mtfAlignment = computeMtfAlignment(row, bias);
  }

  // 4. Entry timing + volatility filters.
  // Build a per-group candle-time-sorted index so we can look up the
  // previous row's bandWidth / bandWidthMa for the squeeze-breakout check.
  const prevByRow = new WeakMap<ParsedRow, ParsedRow | null>();
  for (const group of groups.values()) {
    const sorted = sortByCandleTime(group);
    for (let i = 0; i < sorted.length; i++) {
      prevByRow.set(sorted[i], i > 0 ? sorted[i - 1] : null);
    }
  }
  for (const row of rows) {
    row.entryTiming = applyEntryTiming(row, row.touchDepthRatioP90, settings);
    const prev = prevByRow.get(row) ?? null;
    row.volatility = applyVolatility(
      row,
      row.bandWidthMa,
      prev?.bandWidth ?? null,
      prev?.bandWidthMa ?? null,
    );
  }

  // 5. Dynamic exits.
  for (const row of rows) {
    const ex = computeExits(row);
    row.entry = ex.entry;
    row.target1 = ex.target1;
    row.target2 = ex.target2;
    row.stop = ex.stop;
  }

  // 6. Session context.
  for (const row of rows) {
    const s = computeSession(row, settings);
    row.sessionLabel = s.label;
    row.favoredRegime = s.favored;
  }

  return rows;
}

/** Group key helper for asset/timeframe. */
export function assetTfKey(asset: string, timeframe: string): string {
  return `${asset}|${timeframe}`;
}

/** Re-export for callers that need the AssetTfKey type. */
export type { AssetTfKey };
