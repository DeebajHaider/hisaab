import { beforeEach, describe, expect, it } from "vitest";
import {
  claimResume,
  isResumable,
  readLastPath,
  resolveResumePath,
  saveLastPath,
} from "./resume-path";

describe("isResumable", () => {
  it("accepts budget and portfolio pages only", () => {
    expect(isResumable("/app/budgets/b1/ledger")).toBe(true);
    expect(isResumable("/app/budgets/b1")).toBe(true);
    expect(isResumable("/app/portfolio/p1/holdings")).toBe(true);
    expect(isResumable("/app")).toBe(false);
    expect(isResumable("/app/settings")).toBe(false);
    expect(isResumable("/app/budgets")).toBe(false);
    expect(isResumable("/auth")).toBe(false);
  });
});

describe("resolveResumePath", () => {
  it("reopens the Day view on today rather than the day that was open", () => {
    expect(resolveResumePath("/app/budgets/b1/day/2026-09-01", "2026-10-06")).toBe(
      "/app/budgets/b1/day/2026-10-06",
    );
  });

  it("keeps other pages as they were", () => {
    expect(resolveResumePath("/app/budgets/b1/month/2026-09", "2026-10-06")).toBe(
      "/app/budgets/b1/month/2026-09",
    );
    expect(resolveResumePath("/app/portfolio/p1/overview", "2026-10-06")).toBe(
      "/app/portfolio/p1/overview",
    );
  });

  it("returns null for nothing stored or a path that is not resumable", () => {
    expect(resolveResumePath(null)).toBeNull();
    expect(resolveResumePath("https://evil.example/app/budgets/x")).toBeNull();
    expect(resolveResumePath("/app/settings")).toBeNull();
  });
});

describe("saved path", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("is remembered per user and ignores pages that are not resumable", () => {
    saveLastPath("u1", "/app/budgets/b1/ledger");
    saveLastPath("u2", "/app/portfolio/p9/overview");
    saveLastPath("u1", "/app/settings");

    expect(readLastPath("u1")).toBe("/app/budgets/b1/ledger");
    expect(readLastPath("u2")).toBe("/app/portfolio/p9/overview");
    expect(readLastPath("u3")).toBeNull();
  });
});

describe("claimResume", () => {
  beforeEach(() => sessionStorage.clear());

  it("is true once per browser session", () => {
    expect(claimResume()).toBe(true);
    expect(claimResume()).toBe(false);
  });
});
