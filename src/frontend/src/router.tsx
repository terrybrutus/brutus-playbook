import { Route as RootRoute } from "@/routes/__root";
import DashboardPage from "@/routes/index";
import { SettingsPage } from "@/routes/settings";
import { SignalsPage } from "@/routes/signals";
import { SignalDetailPage } from "@/routes/signals/$id";
import { StrategyPage } from "@/routes/strategy";
import type { QueryClient } from "@tanstack/react-query";
import { createRoute, createRouter, redirect } from "@tanstack/react-router";
import { z } from "zod";

/**
 * TanStack Router configuration.
 *
 * Routes:
 *  - /            Dashboard (index)
 *  - /signals     Signals feed (with URL-persisted filters/sort)
 *  - /signals/$id Signal detail
 *  - /settings    Settings
 *  - /strategy    Strategy explainer
 */

const ALL_FILTER = "all";
const signalsSearchSchema = z.object({
  asset: z.string().optional(),
  timeframe: z.string().optional(),
  regime: z.string().optional(),
  session: z.string().optional(),
  sort: z.enum(["time", "touchDepthRatio", "rsi"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});

const DashboardRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: DashboardPage,
});

const SignalsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/signals",
  component: SignalsPage,
  validateSearch: (input: Record<string, unknown>) =>
    signalsSearchSchema.parse(input),
});

const SignalDetailRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/signals/$id",
  component: SignalDetailPage,
});

const SettingsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/settings",
  component: SettingsPage,
});

const StrategyRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/strategy",
  component: StrategyPage,
});

const IndexRedirectRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/index",
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});

const routeTree = RootRoute.addChildren([
  DashboardRoute,
  SignalsRoute.addChildren([SignalDetailRoute]),
  SettingsRoute,
  StrategyRoute,
  IndexRedirectRoute,
]);

export function buildRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    trailingSlash: "never",
  });
}

export type Router = ReturnType<typeof buildRouter>;

// Re-export the ALL_FILTER sentinel so the Signals page can compare against the
// same default value the search schema treats as "no filter".
export { ALL_FILTER as SIGNALS_ALL_FILTER };
