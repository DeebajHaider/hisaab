import { afterEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn() }));
vi.mock("@sentry/react", () => sentry);

afterEach(() => {
  vi.resetModules();
  sentry.init.mockReset();
  sentry.captureException.mockReset();
});

describe("error reporting", () => {
  it("does nothing, and loads nothing, without a DSN", async () => {
    const { initErrorReporting } = await import("./error-reporting");
    expect(await initErrorReporting(undefined)).toBe(false);
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("starts Sentry with errors only (no tracing) when a DSN is given", async () => {
    const { initErrorReporting } = await import("./error-reporting");
    expect(await initErrorReporting("https://key@o1.ingest.sentry.io/1", "production")).toBe(true);
    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://key@o1.ingest.sentry.io/1",
        environment: "production",
        tracesSampleRate: 0,
      }),
    );
  });

  it("logs locally and forwards to Sentry once it is on", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { initErrorReporting, reportError } = await import("./error-reporting");
    const boom = new Error("boom");

    reportError(boom); // before init: logged only
    expect(sentry.captureException).not.toHaveBeenCalled();

    await initErrorReporting("https://key@o1.ingest.sentry.io/1");
    reportError(boom, { where: "test" });

    expect(log).toHaveBeenCalledWith(boom);
    expect(sentry.captureException).toHaveBeenCalledWith(boom, { extra: { where: "test" } });
    log.mockRestore();
  });
});
