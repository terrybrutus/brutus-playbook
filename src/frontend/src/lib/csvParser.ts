import { SignalType } from "@/backend";
import type { ParseResult, ParseWarning, ParsedRow } from "@/types";
import Papa from "papaparse";

/**
 * TradingView alert-log CSV parser.
 *
 * The CSV has 5 top-level columns: Alert ID, Ticker, Name, Description, Time.
 * The Description field is an embedded JSON string with ~48 strategy keys.
 * All cell contents are treated as untrusted data — never executed.
 */

const REQUIRED_TOP_COLUMNS = [
  "alert id",
  "ticker",
  "name",
  "description",
  "time",
] as const;

const REQUIRED_JSON_KEYS = [
  "symbol",
  "timeframe",
  "open",
  "high",
  "low",
  "close",
  "upper",
  "lower",
  "bandWidth",
  "touchDepth",
  "touchDepthRatio",
  "minutesIntoBar",
] as const;

/** Normalize a column name: lowercase, strip spaces/underscores. */
function normKey(s: string): string {
  return s.toLowerCase().replace(/[\s_]+/g, "");
}

/** Build a case-insensitive, tolerant column lookup. */
function buildColumnMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    map[normKey(h)] = h;
  }
  return map;
}

/** Safely parse the Description JSON field. Returns null on failure. */
function safeParseDescription(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return typeof obj === "object" && obj !== null ? obj : null;
  } catch {
    return null;
  }
}

/** Coerce an unknown value to a number, tolerant of strings. */
function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Coerce an unknown value to a boolean. */
function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.trim().toLowerCase() === "true";
  return false;
}

/** Extract asset from symbol field, stripping the exchange prefix. */
function extractAsset(symbol: unknown): string {
  const s = typeof symbol === "string" ? symbol : "";
  // "ALCHEMY:DJ30.R" -> "DJ30.R"
  const idx = s.indexOf(":");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

/** Extract timeframe from Ticker field (e.g. "ALCHEMY:DJ30.R, 1m" -> "1m"). */
function extractTimeframeFromTicker(ticker: string): string | null {
  const m = ticker.match(/,\s*([0-9]+[smh])\s*$/i);
  return m ? m[1].toLowerCase() : null;
}

/** Normalize a timeframe string of minutes (e.g. "1" -> "1m"). */
function normalizeTimeframe(tf: unknown, ticker: string): string {
  const fromTicker = extractTimeframeFromTicker(ticker);
  if (fromTicker) return fromTicker;
  if (typeof tf === "string") {
    const t = tf.trim();
    if (/^[0-9]+[smh]$/i.test(t)) return t.toLowerCase();
    if (/^[0-9]+$/.test(t)) return `${t}m`;
  }
  if (typeof tf === "number") return `${tf}m`;
  return "1m";
}

/**
 * Parse a TradingView alert-log CSV string into ParsedRow[].
 * Surfaces warnings for missing required columns instead of crashing.
 */
export function parseAlertCsv(csvText: string): ParseResult {
  const warnings: ParseWarning[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = (parsed.meta.fields ?? []).map((h) => h);
  const colMap = buildColumnMap(headers);

  // Validate required top-level columns.
  for (const req of REQUIRED_TOP_COLUMNS) {
    if (!(normKey(req) in colMap)) {
      warnings.push({
        column: req,
        message: `Required column "${req}" is missing from the CSV header.`,
      });
    }
  }

  // If Description is missing entirely, we cannot proceed.
  if (!(normKey("description") in colMap)) {
    return { rows: [], warnings, skipped: parsed.data.length };
  }

  const descKey = colMap[normKey("description")];
  const alertIdKey = colMap[normKey("alert id")] ?? "";
  const tickerKey = colMap[normKey("ticker")] ?? "";
  const nameKey = colMap[normKey("name")] ?? "";
  const timeKey = colMap[normKey("time")] ?? "";

  const rows: ParsedRow[] = [];
  let skipped = 0;
  let warnedJsonKeys = new Set<string>();

  for (const rec of parsed.data) {
    const descRaw = rec[descKey] ?? "";
    const json = safeParseDescription(descRaw);
    if (!json) {
      skipped++;
      continue;
    }

    // Warn once per missing required JSON key.
    for (const k of REQUIRED_JSON_KEYS) {
      if (!(k in json) && !warnedJsonKeys.has(k)) {
        warnedJsonKeys.add(k);
        warnings.push({
          column: k,
          message: `Strategy-required JSON key "${k}" is missing from one or more Description fields.`,
        });
      }
    }

    const ticker = rec[tickerKey] ?? "";
    const timeframe = normalizeTimeframe(json.timeframe, ticker);
    const candleTimeMs =
      typeof json.time === "number"
        ? json.time
        : typeof json.time === "string"
          ? Number(json.time) || null
          : null;

    const row: ParsedRow = {
      alertId: rec[alertIdKey] ?? "",
      ticker,
      name: rec[nameKey] ?? "",
      time: rec[timeKey] ?? "",
      timestamp: rec[timeKey] ?? "",
      candleTimeMs,
      asset: extractAsset(json.symbol),
      timeframe,
      open: toNum(json.open),
      high: toNum(json.high),
      low: toNum(json.low),
      close: toNum(json.close),
      bbUpper: toNum(json.upper),
      bbLower: toNum(json.lower),
      bbBasis: (toNum(json.upper) + toNum(json.lower)) / 2,
      bandWidth: toNum(json.bandWidth),
      touchDepth: toNum(json.touchDepth),
      touchDepthRatio: toNum(json.touchDepthRatio),
      longSnapback: toBool(json.longSnapback),
      shortSnapback: toBool(json.shortSnapback),
      longPushThrough: toBool(json.longPushThrough),
      shortPushThrough: toBool(json.shortPushThrough),
      newLongTouch: toBool(json.newLongTouch),
      newShortTouch: toBool(json.newShortTouch),
      pushThrough:
        toBool(json.longPushThrough) || toBool(json.shortPushThrough),
      decisionEvent:
        typeof json.decisionEvent === "string" ? json.decisionEvent : "",
      mode: typeof json.mode === "string" ? json.mode : "",
      signalDirection:
        typeof json.signalDirection === "string" ? json.signalDirection : "",
      reason: typeof json.reason === "string" ? json.reason : "",
      inSession: toBool(json.inSession),
      minutesIntoBar: toNum(json.minutesIntoBar),
      bbLength: toNum(json.length),
      stdDev: toNum(json.stdDev),
      upperSource:
        typeof json.upperSource === "string" ? json.upperSource : "high",
      lowerSource:
        typeof json.lowerSource === "string" ? json.lowerSource : "low",
      // Computed indicators — filled by strategyEngine.
      derivedRsi: null,
      bandWidthMa: null,
      touchDepthRatioP90: null,
      // Classification — filled by strategyEngine.
      regime: "no_trade",
      htfBias: "unknown",
      mtfAlignment: "no_htf_data",
      entryTiming: "fail",
      volatility: "n/a",
      sessionLabel: "off_hours",
      favoredRegime: "neutral",
      // Dynamic exits — filled by strategyEngine.
      entry: toNum(json.entry),
      target1: 0,
      target2: 0,
      stop: toNum(json.stop),
      signalType: SignalType.noTrade,
    };

    rows.push(row);
  }

  return { rows, warnings, skipped };
}
