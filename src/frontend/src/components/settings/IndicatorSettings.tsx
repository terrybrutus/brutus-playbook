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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useFormContext } from "react-hook-form";

/**
 * Indicator parameters: Bollinger Bands, RSI, bandWidth-MA, touchDepthRatio
 * percentile, and RSI embed/overbought/oversold thresholds.
 *
 * BB source (high/low) is per-row in the CSV and not a global setting, so it
 * is not editable here — the strategy engine reads it from each parsed row.
 */
export function IndicatorSettings() {
  const { control } = useFormContext();

  return (
    <Card data-ocid="settings.indicator.card" className="border-border bg-card">
      <CardHeader>
        <CardTitle className="font-display text-base font-semibold tracking-tight">
          Indicators
        </CardTitle>
        <CardDescription className="font-mono text-[11px]">
          Bollinger Bands, RSI, and touch-depth parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Bollinger Bands */}
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Bollinger Bands
          </p>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="bbLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>BB length</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      max={100}
                      step={1}
                      data-ocid="settings.bb_length.input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Lookback periods (default 9)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="bbStdDev"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>BB stddev</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0.5}
                      max={5}
                      step={0.1}
                      data-ocid="settings.bb_stddev.input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Band multiplier (default 2.0)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={control}
            name="bbLength"
            render={() => (
              <FormItem className="hidden">
                <FormLabel>BB source</FormLabel>
                <FormControl>
                  <Select disabled>
                    <SelectTrigger
                      data-ocid="settings.bb_source.select"
                      className="w-full"
                    >
                      <SelectValue placeholder="Per-row (high/low)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">
                        high (upper) / low (lower)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  BB source is read per-row from the CSV (high for upper, low
                  for lower) — not a global setting.
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* RSI */}
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            RSI (derived from close)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="rsiPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSI length</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      max={50}
                      step={1}
                      data-ocid="settings.rsi_length.input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Matched to BB length (default 9)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="bandWidthMaWindow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>bandWidth-MA window</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      max={200}
                      step={1}
                      data-ocid="settings.bandwidth_ma_window.input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>SMA window (default 20)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="rsiEmbedHigh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSI embed high</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      step={1}
                      data-ocid="settings.rsi_embed_high.input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Push-through long gate (default 80)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="rsiEmbedLow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSI embed low</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      data-ocid="settings.rsi_embed_low.input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Push-through short gate (default 20)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="rsiOverbought"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSI overbought</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      step={1}
                      data-ocid="settings.rsi_overbought.input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Snapback short trigger (default 70)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="rsiOversold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSI oversold</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      data-ocid="settings.rsi_oversold.input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Snapback long trigger (default 30)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Touch depth */}
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Touch depth
          </p>
          <FormField
            control={control}
            name="touchDepthRatioPercentile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Touch-depth extreme percentile</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={50}
                    max={99}
                    step={1}
                    data-ocid="settings.touch_depth_percentile.input"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Percentile for the early-bar touch-depth gate (default 90)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
