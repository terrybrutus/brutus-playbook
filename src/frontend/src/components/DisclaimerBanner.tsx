import { AlertTriangle } from "lucide-react";

/**
 * Persistent disclaimer banner shown on every page.
 * Educational paper-analysis only — not financial advice, not connected to
 * any exchange. Styled with the destructive/coral accent.
 */
export function DisclaimerBanner() {
  return (
    <div
      data-ocid="disclaimer.banner"
      role="note"
      aria-label="Educational disclaimer"
      className="flex items-start gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive-foreground"
    >
      <AlertTriangle
        className="mt-0.5 size-3.5 shrink-0 text-destructive"
        aria-hidden="true"
      />
      <p className="font-mono leading-relaxed text-destructive">
        <span className="font-semibold">Educational paper-analysis tool.</span>{" "}
        Not financial advice. Not connected to any exchange. Past signals do not
        predict future results.
      </p>
    </div>
  );
}
