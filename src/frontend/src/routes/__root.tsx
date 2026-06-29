import { Layout } from "@/components/Layout";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

/**
 * Root route — renders the Layout shell with an Outlet for child routes.
 * Carries the QueryClient via route context for loader support.
 */
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Layout,
});
