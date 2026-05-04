import { QueryClient } from "@tanstack/react-query";

// Singleton query client for the whole app.
// Defaults are conservative — refetch on window focus is helpful for keeping
// data fresh when users tab away and come back.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered "fresh" (no refetch on remount).
      // 30s is a reasonable balance for a budget app — data changes occasionally.
      staleTime: 30 * 1000,
      // Retry once on failure. The default of 3 is overkill for our case.
      retry: 1,
    },
  },
});