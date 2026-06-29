import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Regime, SessionLabel } from "@/types";
import { Filter } from "lucide-react";

/**
 * Filter controls for the Signals feed.
 * State persists via URL search params (asset, timeframe, regime, session).
 * Each Select uses the sentinel value "all" to mean "no filter".
 */

export type FilterKey = "asset" | "timeframe" | "regime" | "session";

export interface SignalFiltersValue {
  asset: string;
  timeframe: string;
  regime: string;
  session: string;
}

export const ALL_FILTER = "all";

const REGIME_OPTIONS: { value: Exclude<Regime, "no_trade">; label: string }[] =
  [
    { value: "snapback_long", label: "Snapback Long" },
    { value: "snapback_short", label: "Snapback Short" },
    { value: "pushthrough_long", label: "Push-Through Long" },
    { value: "pushthrough_short", label: "Push-Through Short" },
  ];

const SESSION_OPTIONS: { value: SessionLabel; label: string }[] = [
  { value: "asian", label: "Asian" },
  { value: "european", label: "European" },
  { value: "overlap", label: "Asia/EU Overlap" },
  { value: "us_open", label: "US Open" },
  { value: "off_hours", label: "Off-Hours" },
];

interface SignalFiltersProps {
  value: SignalFiltersValue;
  onChange: (key: FilterKey, next: string) => void;
  onReset: () => void;
  /** Distinct asset values present in the dataset. */
  assets: string[];
  /** Distinct timeframe values present in the dataset. */
  timeframes: string[];
  /** Whether any filter is currently active (drives the reset button). */
  hasActiveFilter: boolean;
}

export function SignalFilters({
  value,
  onChange,
  onReset,
  assets,
  timeframes,
  hasActiveFilter,
}: SignalFiltersProps) {
  return (
    <div
      data-ocid="signals.filter_panel"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3 shadow-subtle"
    >
      <div className="flex items-center gap-1.5 pr-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <Filter className="size-3.5" aria-hidden="true" />
        Filters
      </div>

      <FilterSelect
        ocid="signals.filter.asset"
        label="Asset"
        placeholder="All assets"
        current={value.asset}
        options={assets.map((a) => ({ value: a, label: a }))}
        onChange={(v) => onChange("asset", v)}
      />

      <FilterSelect
        ocid="signals.filter.timeframe"
        label="Timeframe"
        placeholder="All timeframes"
        current={value.timeframe}
        options={timeframes.map((t) => ({ value: t, label: t }))}
        onChange={(v) => onChange("timeframe", v)}
      />

      <FilterSelect
        ocid="signals.filter.regime"
        label="Regime"
        placeholder="All regimes"
        current={value.regime}
        options={REGIME_OPTIONS}
        onChange={(v) => onChange("regime", v)}
      />

      <FilterSelect
        ocid="signals.filter.session"
        label="Session"
        placeholder="All sessions"
        current={value.session}
        options={SESSION_OPTIONS}
        onChange={(v) => onChange("session", v)}
      />

      {hasActiveFilter && (
        <button
          type="button"
          data-ocid="signals.filter.reset_button"
          onClick={onReset}
          className="ml-auto inline-flex h-8 items-center rounded-md border border-border px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-smooth hover:border-foreground/30 hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

interface FilterSelectProps {
  ocid: string;
  label: string;
  placeholder: string;
  current: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function FilterSelect({
  ocid,
  label,
  placeholder,
  current,
  options,
  onChange,
}: FilterSelectProps) {
  const isAll = current === ALL_FILTER || !current;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={`${ocid}-trigger`}
        className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <Select
        value={isAll ? ALL_FILTER : current}
        onValueChange={(v) => onChange(v === ALL_FILTER ? ALL_FILTER : v)}
      >
        <SelectTrigger
          id={`${ocid}-trigger`}
          data-ocid={ocid}
          size="sm"
          className={isAll ? "text-muted-foreground" : "text-foreground"}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER}>{placeholder}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
