import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { TopNav } from "@/components/TopNav";
import { Outlet } from "@tanstack/react-router";

/**
 * App shell wrapping every page with the top navigation, the persistent
 * disclaimer banner, and the branding footer.
 */
export function Layout() {
  const year = new Date().getFullYear();
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <TopNav />
      <DisclaimerBanner />

      <main className="flex-1 bg-background">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <p className="font-mono">
            &copy; {year}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.hostname : "",
              )}`}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              data-ocid="footer.caffeine_link"
            >
              caffeine.ai
            </a>
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider">
            Brutus Playbook &middot; Educational only
          </p>
        </div>
      </footer>
    </div>
  );
}
