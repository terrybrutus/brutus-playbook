import { parseAlertCsv } from "@/lib/csvParser";
import type { ParseResult } from "@/types";

/**
 * Fetch the shipped sample TradingView alert-log CSV from public/assets and
 * parse it through the csvParser module. Educational paper-analysis only.
 */
export async function loadSampleDataset(): Promise<ParseResult> {
  const res = await fetch("/assets/tradingview_alerts_log_2026-06-28.csv", {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load sample dataset (HTTP ${res.status}).`);
  }
  const text = await res.text();
  return parseAlertCsv(text);
}
