type SentryModule = typeof import("@sentry/react");

let sentry: SentryModule | null = null;

/**
 * Start sending crashes to Sentry, if a DSN is configured (VITE_SENTRY_DSN).
 * Without one this does nothing, and the Sentry code is never downloaded.
 * Loaded on demand so it adds nothing to the main bundle.
 */
export async function initErrorReporting(
  dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN,
  environment: string = import.meta.env.MODE,
): Promise<boolean> {
  if (!dsn) return false;
  try {
    sentry = await import("@sentry/react");
    sentry.init({
      dsn,
      environment,
      // Errors only: no performance tracing or session replay, which would
      // send more of what people are looking at than a crash report needs.
      tracesSampleRate: 0,
    });
    return true;
  } catch {
    sentry = null;
    return false;
  }
}

/** Record a caught error. Always logs locally; also reports when Sentry is on. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  console.error(error);
  sentry?.captureException(error, context ? { extra: context } : undefined);
}
