import { SettingsForm } from "@/components/settings/SettingsForm";

/**
 * Settings route page.
 *
 * Thin shell around the SettingsForm — header + form. All strategy parameters
 * live here; changes re-run the pipeline live via useAppStore.updateSettings.
 */
export function SettingsPage() {
  return (
    <section
      data-ocid="settings.page"
      className="mx-auto max-w-[1100px] px-4 py-8"
    >
      <header className="mb-6 flex flex-col gap-1 border-b border-border pb-5">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex size-7 items-center justify-center rounded-md bg-primary/15 font-mono text-xs text-primary"
            aria-hidden="true"
          >
            S
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Strategy Settings
          </h1>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          RSI / Bollinger / session / volatility parameters — edits re-run the
          pipeline live across every page.
        </p>
      </header>

      <SettingsForm />
    </section>
  );
}
