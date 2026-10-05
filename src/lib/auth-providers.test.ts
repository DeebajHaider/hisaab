import { describe, expect, it } from "vitest";
import { hasPasswordLogin, oauthRedirectUrl } from "./auth-providers";

describe("oauthRedirectUrl", () => {
  it("returns to the app by default", () => {
    expect(oauthRedirectUrl("https://x.app", null)).toBe("https://x.app/app");
  });

  it("returns to a pending invite so it can be accepted", () => {
    expect(oauthRedirectUrl("https://x.app", "tok123")).toBe("https://x.app/invite/tok123");
  });
});

describe("hasPasswordLogin", () => {
  it("is true for email accounts, including ones that also linked Google", () => {
    expect(hasPasswordLogin({ app_metadata: { providers: ["email"] } })).toBe(true);
    expect(hasPasswordLogin({ app_metadata: { providers: ["google", "email"] } })).toBe(true);
  });

  it("is false for Google-only accounts", () => {
    expect(hasPasswordLogin({ app_metadata: { providers: ["google"] } })).toBe(false);
    expect(hasPasswordLogin({ app_metadata: { provider: "google" } })).toBe(false);
  });

  it("is false when signed out", () => {
    expect(hasPasswordLogin(null)).toBe(false);
  });
});
