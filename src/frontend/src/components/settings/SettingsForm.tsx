import { FilterSettings } from "@/components/settings/FilterSettings";
import { IndicatorSettings } from "@/components/settings/IndicatorSettings";
import { SessionSettings } from "@/components/settings/SessionSettings";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcwIcon } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

/**
 * Form schema mirroring AppSettings. Numeric fields are coerced and bounded so
 * invalid input is rejected before reaching the strategy engine.
 */
const settingsSchema = z.object({
  rsiPeriod: z.coerce.number().int().min(2).max(50),
  bbLength: z.coerce.number().int().min(2).max(100),
  bbStdDev: z.coerce.number().min(0.5).max(5),
  bandWidthMaWindow: z.coerce.number().int().min(2).max(200),
  touchDepthRatioPercentile: z.coerce.number().min(50).max(99),
  rsiEmbedHigh: z.coerce.number().min(50).max(100),
  rsiEmbedLow: z.coerce.number().min(0).max(50),
  rsiOverbought: z.coerce.number().min(50).max(100),
  rsiOversold: z.coerce.number().min(0).max(50),
  minMinutesIntoBar: z.coerce.number().min(0).max(1),
  minBandWidthRatio: z.coerce.number().min(0).max(10),
  sessionStart: z.string().min(1),
  sessionEnd: z.string().min(1),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

/**
 * Top-level settings form. Owns react-hook-form state, watches for changes,
 * and pushes them into the Zustand store (which re-runs the strategy pipeline).
 */
export function SettingsForm() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const resetSettings = useAppStore((s) => s.resetSettings);
  const datasetName = useAppStore((s) => s.datasetName);

  // zod 4.x + @hookform/resolvers 5.x: z.coerce.* produces an input type of
  // `unknown` (strings from the DOM) and an output type of `number`. The
  // resolver's input/output types don't line up with a single SettingsFormValues
  // generic, so cast the resolver to the form's value type.
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsFormValues>,
    defaultValues: settings,
    values: settings,
    mode: "onChange",
  });

  // Live re-run: any validated change is pushed to the store immediately so
  // Dashboard / Signals / Signal detail update in place.
  useEffect(() => {
    const subscription = form.watch((value) => {
      const parsed = settingsSchema.safeParse(value);
      if (parsed.success) {
        updateSettings(parsed.data as Partial<AppSettings>);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, updateSettings]);

  // Keep form in sync if the store is reset elsewhere.
  useEffect(() => {
    form.reset(settings);
  }, [settings, form]);

  const handleReset = () => {
    resetSettings();
    form.reset(DEFAULT_SETTINGS);
    toast.success("Settings reset to defaults", {
      description: "Strategy pipeline re-run with default parameters.",
    });
  };

  const hasDataset = datasetName !== null;

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-6">
        {!hasDataset && (
          <div
            data-ocid="settings.empty_state"
            className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3"
          >
            <p className="font-mono text-xs text-muted-foreground">
              No dataset loaded — settings still apply, but you won&apos;t see
              signal changes until a dataset is loaded from the Dashboard.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <IndicatorSettings />
          <div className="flex flex-col gap-6">
            <FilterSettings />
            <SessionSettings />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Changes apply live &middot; no save needed
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            data-ocid="settings.reset_button"
          >
            <RotateCcwIcon className="size-3.5" aria-hidden="true" />
            Reset to defaults
          </Button>
        </div>
      </div>
    </FormProvider>
  );
}
