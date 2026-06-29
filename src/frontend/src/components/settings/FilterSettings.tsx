import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useFormContext } from "react-hook-form";

/**
 * Filter parameters: entry-timing (minutesIntoBar late-cutoff) and the
 * volatility bandWidth-ratio fallback.
 *
 * The early-bar cutoff (0.5) is hardcoded in the strategy engine and not
 * exposed as a setting. MTF filter/trigger timeframe assignments are derived
 * per-row from the CSV Ticker field and are not part of AppSettings.
 */
export function FilterSettings() {
  const { control } = useFormContext();

  return (
    <Card data-ocid="settings.filter.card" className="border-border bg-card">
      <CardHeader>
        <CardTitle className="font-display text-base font-semibold tracking-tight">
          Filters
        </CardTitle>
        <CardDescription className="font-mono text-[11px]">
          Entry-timing and volatility gates
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Entry timing (minutesIntoBar)
          </p>
          <FormField
            control={control}
            name="minMinutesIntoBar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Late-cutoff</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    data-ocid="settings.min_minutes_into_bar.input"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Bars past this fraction of the candle pass the timing gate
                  (default 0.85). Early-cutoff (0.5) is fixed in the engine.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Volatility
          </p>
          <FormField
            control={control}
            name="minBandWidthRatio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min bandWidth ratio (fallback)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    data-ocid="settings.min_bandwidth_ratio.input"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Fallback touch-depth threshold when the percentile can&apos;t
                  be computed (default 1.0)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            MTF timeframes
          </p>
          <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2.5">
            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              MTF filter (15m, 1h) and trigger (1m, 3m, 5m) timeframe
              assignments are derived per-row from the CSV Ticker field and are
              not configurable as global settings in this build.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
