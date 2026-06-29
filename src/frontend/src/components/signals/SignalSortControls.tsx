import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";

/**
 * Sort controls for the Signals feed.
 * Sort key (time / touchDepthRatio / rsi) + direction (asc / desc) persist
 * via URL search params.
 */

export type SortKey = "time" | "touchDepthRatio" | "rsi";
export type SortDir = "asc" | "desc";

export interface SignalSortValue {
  key: SortKey;
  dir: SortDir;
}

interface SignalSortControlsProps {
  value: SignalSortValue;
  onChange: (next: SignalSortValue) => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "time", label: "Time" },
  { value: "touchDepthRatio", label: "Touch Pctl" },
  { value: "rsi", label: "RSI" },
];

export function SignalSortControls({
  value,
  onChange,
}: SignalSortControlsProps) {
  return (
    <div data-ocid="signals.sort_panel" className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Sort
      </span>
      <ToggleGroup
        type="single"
        value={value.key}
        onValueChange={(next) => {
          if (next) onChange({ ...value, key: next as SortKey });
        }}
        variant="outline"
        size="sm"
        className="rounded-md border border-border bg-card"
        aria-label="Sort by"
      >
        {SORT_OPTIONS.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            data-ocid={`signals.sort.${opt.value}`}
            aria-label={`Sort by ${opt.label}`}
            className={cn(
              "px-3 font-mono text-[10px] uppercase tracking-wider",
              value.key === opt.value
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground",
            )}
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <button
        type="button"
        data-ocid="signals.sort.dir"
        aria-label={value.dir === "asc" ? "Ascending" : "Descending"}
        aria-pressed={value.dir === "desc"}
        onClick={() =>
          onChange({ ...value, dir: value.dir === "asc" ? "desc" : "asc" })
        }
        className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-smooth hover:border-foreground/30 hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {value.dir === "asc" ? (
          <ArrowUpNarrowWide className="size-3.5" aria-hidden="true" />
        ) : (
          <ArrowDownNarrowWide className="size-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
