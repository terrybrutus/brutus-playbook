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
import { useFormContext } from "react-hook-form";

/**
 * Active session window (UTC). Rows whose candle time falls outside this
 * window are labeled off_hours and excluded from favored-regime scoring.
 */
export function SessionSettings() {
  const { control } = useFormContext();

  return (
    <Card data-ocid="settings.session.card" className="border-border bg-card">
      <CardHeader>
        <CardTitle className="font-display text-base font-semibold tracking-tight">
          Active Session
        </CardTitle>
        <CardDescription className="font-mono text-[11px]">
          UTC window for in-session classification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="sessionStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    data-ocid="settings.session_start.input"
                    {...field}
                  />
                </FormControl>
                <FormDescription>UTC (default 03:00)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="sessionEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    data-ocid="settings.session_end.input"
                    {...field}
                  />
                </FormControl>
                <FormDescription>UTC (default 12:00)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
