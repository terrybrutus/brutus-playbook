import type { SignalType as BackendSignalType } from "@/backend";

/** Re-export the backend enum so UI code imports from one place. */
export { SignalType } from "@/backend";
export type { SignalRow as BackendSignalRow } from "@/backend";

/** Regime classification outcome for a parsed row. */
export type Regime =
  | "snapback_long"
  | "snapback_short"
  | "pushthrough_long"
  | "pushthrough_short"
  | "no_trade";

/** Higher-timeframe directional bias derived from push-through regime. */
export type HtfBias = "long" | "short" | "neutral" | "unknown";

/** MTF alignment verdict shown on each signal card. */
export type MtfAlignment = "aligned" | "misaligned" | "no_htf_data";

/** Session label derived from the alert timestamp. */
export type SessionLabel =
  | "asian"
  | "european"
  | "overlap"
  | "us_open"
  | "off_hours";

/** Volatility filter verdict. */
export type VolatilityVerdict = "pass" | "fail" | "n/a";

/** Entry-timing filter verdict. */
export type EntryTimingVerdict = "pass" | "fail";

/** A single parsed + enriched alert row. */
export interface ParsedRow {
  alertId: string;
  ticker: string;
  name: string;
  time: string;
  /** Raw ISO timestamp from the Time column. */
  timestamp: string;
  /** Epoch ms from the embedded JSON `time` key (candle time). */
  candleTimeMs: number | null;
  asset: string;
  timeframe: string;
  // OHLC
  open: number;
  high: number;
  low: number;
  close: number;
  // Bollinger
  bbUpper: number;
  bbLower: number;
  bbBasis: number;
  bandWidth: number;
  // Touch
  touchDepth: number;
  touchDepthRatio: number;
  // Strategy flags
  longSnapback: boolean;
  shortSnapback: boolean;
  longPushThrough: boolean;
  shortPushThrough: boolean;
  newLongTouch: boolean;
  newShortTouch: boolean;
  pushThrough: boolean;
  decisionEvent: string;
  mode: string;
  signalDirection: string;
  reason: string;
  inSession: boolean;
  minutesIntoBar: number;
  // BB config from the row
  bbLength: number;
  stdDev: number;
  upperSource: string;
  lowerSource: string;
  // Computed indicators
  derivedRsi: number | null;
  bandWidthMa: number | null;
  touchDepthRatioP90: number | null;
  // Classification + filters
  regime: Regime;
  htfBias: HtfBias;
  mtfAlignment: MtfAlignment;
  entryTiming: EntryTimingVerdict;
  volatility: VolatilityVerdict;
  sessionLabel: SessionLabel;
  favoredRegime: "snapback" | "push_through" | "neutral";
  // Dynamic exits
  entry: number;
  target1: number;
  target2: number;
  stop: number;
  /** Backend enum value for persistence. */
  signalType: BackendSignalType;
}

/** A warning surfaced when a strategy-required column is missing. */
export interface ParseWarning {
  column: string;
  message: string;
}

/** Result of parsing a CSV file. */
export interface ParseResult {
  rows: ParsedRow[];
  warnings: ParseWarning[];
  /** Number of raw CSV rows that could not be parsed. */
  skipped: number;
}

/** App-wide configurable settings (mirrors backend Settings + extras). */
export interface AppSettings {
  rsiPeriod: number;
  bbLength: number;
  bbStdDev: number;
  bandWidthMaWindow: number;
  touchDepthRatioPercentile: number;
  rsiEmbedHigh: number;
  rsiEmbedLow: number;
  rsiOverbought: number;
  rsiOversold: number;
  minMinutesIntoBar: number;
  minBandWidthRatio: number;
  sessionStart: string; // "03:00"
  sessionEnd: string; // "12:00"
}

export const DEFAULT_SETTINGS: AppSettings = {
  rsiPeriod: 9,
  bbLength: 9,
  bbStdDev: 2,
  bandWidthMaWindow: 20,
  touchDepthRatioPercentile: 90,
  rsiEmbedHigh: 80,
  rsiEmbedLow: 20,
  rsiOverbought: 70,
  rsiOversold: 30,
  minMinutesIntoBar: 0.85,
  minBandWidthRatio: 1.0,
  sessionStart: "03:00",
  sessionEnd: "12:00",
};

/** Per-asset 1h bias row shown on the Dashboard header. */
export interface AssetBiasRow {
  asset: string;
  bias: HtfBias;
  activeTriggers: number;
  bandWidth: number;
  bandWidthMa: number;
  bandWidthRegime: "above" | "below" | "expanding";
}

/** Group key for asset/timeframe grouping. */
export interface AssetTfKey {
  asset: string;
  timeframe: string;
}
