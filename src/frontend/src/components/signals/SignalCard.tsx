import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type {
  MtfAlignment,
  ParsedRow,
  Regime,
  SessionLabel,
  VolatilityVerdict,
} from "@/types";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Gauge,
  Layers,
  ShieldCheck,
  ShieldX,
  Timer,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * A single trade-setup card in the Signals feed.
 * Clicking navigates to /signals/$id using the row's alertId.
 *
 * Regime accent mapping (Brutus Terminal palette):
 *  - snapback_long/short   → electric green (primary)
 *  - pushthrough_long/short → amber (accent)
 *  - stop / filtered-out   → coral (destructive)
 */

interface RegimeConfig {
  label: string;
  short: string;
  tone: "snapback" | "pushthrough";
  direction: "long" | "short";
  Icon: ComponentType<{ className?: string }>;
}

const REGIME_CONFIG: Record<Exclude<Regime, "no_trade">, RegimeConfig> = {
  snapback_long: {
    label: "Snapback Long",
    short: "SNAP L",
    tone: "snapback",
    direction: "long",
    Icon: ArrowUpRight,
  },
  snapback_short: {
    label: "Snapback Short",
    short: "SNAP S",
    tone: "snapback",
    direction: "short",
    Icon: ArrowDownRight,
  },
  pushthrough_long: {
    label: "Push-Through Long",
    short: "PUSH L",
    tone: "pushthrough",
    direction: "long",
    Icon: ArrowUpRight,
  },
  pushthrough_short: {
    label: "Push-Through Short",
    short: "PUSH S",
    tone: "pushthrough",
    direction: "short",
    Icon: ArrowDownRight,
  },
};

const SESSION_LABELS: Record<SessionLabel, string> = {
  asian: "Asian",
  european: "European",
  overlap: "Asia/EU Overlap",
  us_open: "US Open",
  off_hours: "Off-Hours",
};

const MTF_LABELS: Record<
  MtfAlignment,
  { text: string; tone: "good" | "bad" | "muted" }
> = {
  aligned: { text: "MTF Aligned", tone: "good" },
  misaligned: { text: "MTF Misaligned", tone: "bad" },
  no_htf_data: { text: "No HTF Data", tone: "muted" },
};

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 1 : abs >= 10 ? 2 : 4;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatRsi(rsi: number | null): string {
  if (rsi === null || !Number.isFinite(rsi)) return "—";
  return rsi.toFixed(1);
}

function formatPercentile(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(0)}p`;
}

function formatMinutes(mins: number): string {
  if (!Number.isFinite(mins)) return "—";
  return `${mins.toFixed(2)}m`;
}

interface SignalCardProps {
  row: ParsedRow;
  /** 1-based index for deterministic data-ocid markers. */
  index: number;
}

export function SignalCard({ row, index }: SignalCardProps) {
  const navigate = useNavigate();
  const config = REGIME_CONFIG[row.regime as Exclude<Regime, "no_trade">];
  if (!config) return null;

  const isSnapback = config.tone === "snapback";
  const accentText = isSnapback ? "text-primary" : "text-accent";
  const accentBg = isSnapback ? "bg-primary/10" : "bg-accent/10";
  const accentBorder = isSnapback ? "border-primary/30" : "border-accent/30";

  const mtf = MTF_LABELS[row.mtfAlignment];
  const mtfToneClass =
    mtf.tone === "good"
      ? "text-primary"
      : mtf.tone === "bad"
        ? "text-destructive"
        : "text-muted-foreground";

  const volPass = row.volatility === "pass";
  const volToneClass =
    row.volatility === "n/a"
      ? "text-muted-foreground"
      : volPass
        ? "text-primary"
        : "text-destructive";

  const rsi = row.derivedRsi;
  const rsiTone =
    rsi === null
      ? "text-muted-foreground"
      : rsi <= 30 || rsi >= 70
        ? accentText
        : "text-foreground";

  const handleNavigate = () => {
    navigate({ to: "/signals/$id", params: { id: row.alertId } });
  };

  const { Icon } = config;

  return (
    <button
      type="button"
      data-ocid={`signals.item.${index}`}
      onClick={handleNavigate}
      aria-label={`${config.label} signal for ${row.asset} ${row.timeframe}`}
      className={cn(
        "group relative w-full cursor-pointer overflow-hidden rounded-lg border bg-card text-left text-card-foreground shadow-subtle transition-smooth",
        "hover:border-foreground/30 hover:shadow-elevated focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        accentBorder,
      )}
    >
      {/* Accent rail */}
      <div
        className={cn("h-0.5 w-full", isSnapback ? "bg-primary" : "bg-accent")}
        aria-hidden="true"
      />

      {/* Header: regime + asset/timeframe + time */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <Badge
            variant="outline"
            data-ocid={`signals.regime_badge.${index}`}
            className={cn(
              "gap-1 border font-mono text-[10px] uppercase tracking-wider",
              accentBorder,
              accentBg,
              accentText,
            )}
          >
            <Icon className="size-3" aria-hidden="true" />
            {config.short}
          </Badge>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-foreground">
              {row.asset}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {row.timeframe}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Clock className="size-3" aria-hidden="true" />
          {formatTime(row.timestamp)}
        </div>
      </div>

      <Separator className="my-3" />

      {/* Price ladder: entry / T1 / T2 / stop */}
      <div className="grid grid-cols-4 gap-px bg-border/40 px-4">
        <PriceLevel label="ENTRY" value={row.entry} tone="foreground" />
        <PriceLevel label="T1" value={row.target1} tone="primary" />
        <PriceLevel label="T2" value={row.target2} tone="primary" />
        <PriceLevel label="STOP" value={row.stop} tone="destructive" />
      </div>

      <Separator className="my-3" />

      {/* Indicator strip: RSI / touchDepth / minutesIntoBar / session */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pb-3 sm:grid-cols-4">
        <Metric
          icon={Gauge}
          label="RSI"
          value={formatRsi(rsi)}
          valueClass={rsiTone}
          ocid={`signals.rsi.${index}`}
        />
        <Metric
          icon={Layers}
          label="Touch Pctl"
          value={formatPercentile(row.touchDepthRatio)}
          valueClass="text-foreground"
          ocid={`signals.touch_depth.${index}`}
        />
        <Metric
          icon={Timer}
          label="Min/Bar"
          value={formatMinutes(row.minutesIntoBar)}
          valueClass="text-foreground"
          ocid={`signals.minutes_into_bar.${index}`}
        />
        <Metric
          icon={Clock}
          label="Session"
          value={SESSION_LABELS[row.sessionLabel]}
          valueClass="text-foreground"
          ocid={`signals.session.${index}`}
        />
      </div>

      {/* Footer: MTF alignment + volatility filter */}
      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
        <div
          data-ocid={`signals.mtf_alignment.${index}`}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider"
        >
          <Layers className={cn("size-3", mtfToneClass)} aria-hidden="true" />
          <span className={mtfToneClass}>{mtf.text}</span>
        </div>
        <div
          data-ocid={`signals.volatility.${index}`}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider"
        >
          {volPass ? (
            <ShieldCheck
              className={cn("size-3", volToneClass)}
              aria-hidden="true"
            />
          ) : (
            <ShieldX
              className={cn("size-3", volToneClass)}
              aria-hidden="true"
            />
          )}
          <span className={volToneClass}>
            Vol {row.volatility === "n/a" ? "N/A" : volPass ? "Pass" : "Fail"}
          </span>
        </div>
      </div>
    </button>
  );
}

interface PriceLevelProps {
  label: string;
  value: number;
  tone: "foreground" | "primary" | "destructive";
}

function PriceLevel({ label, value, tone }: PriceLevelProps) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="bg-card px-2 py-2">
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn("font-mono text-xs font-medium tabular-nums", toneClass)}
      >
        {formatPrice(value)}
      </p>
    </div>
  );
}

interface MetricProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClass: string;
  ocid: string;
}

function Metric({ icon: Icon, label, value, valueClass, ocid }: MetricProps) {
  return (
    <div data-ocid={ocid} className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="size-3" aria-hidden="true" />
        <span className="font-mono text-[9px] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span
        className={cn("font-mono text-xs font-medium tabular-nums", valueClass)}
      >
        {value}
      </span>
    </div>
  );
}
