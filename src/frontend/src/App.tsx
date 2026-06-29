import type { Settings } from "@/backend";
import { useUpdateSettings } from "@/lib/backendHooks";
import { buildRouter } from "@/router";
import { setSettingsPersister } from "@/store/useAppStore";
import type { AppSettings } from "@/types";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

const queryClient = new QueryClient();
const router = buildRouter(queryClient);

/** Map frontend AppSettings → backend Settings (only shared fields). */
function toBackendSettings(s: AppSettings): Settings {
  return {
    rsiPeriod: BigInt(s.rsiPeriod),
    bbLength: BigInt(s.bbLength),
    bbStdDev: s.bbStdDev,
    rsiEmbedHigh: s.rsiEmbedHigh,
    rsiEmbedLow: s.rsiEmbedLow,
    rsiOverbought: s.rsiOverbought,
    rsiOversold: s.rsiOversold,
    minMinutesIntoBar: s.minMinutesIntoBar,
    minBandWidthRatio: s.minBandWidthRatio,
  };
}

export default function App() {
  const updateSettings = useUpdateSettings();

  useEffect(() => {
    setSettingsPersister((s) =>
      updateSettings.mutateAsync(toBackendSettings(s)),
    );
    return () => setSettingsPersister(null);
  }, [updateSettings]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
