import { describe, expect, it, vi } from "vitest";
import { backupFileName, buildBackup, fetchAllPages, summarizeBackup, type BudgetBackup } from "./build-backup";

const budget = (txCount: number): BudgetBackup => ({
  budget: { id: "b" },
  categories: [],
  items: [],
  people: [],
  transactions: Array.from({ length: txCount }, (_, i) => ({ id: i })),
  incomeEntries: [],
  savingsEntries: [],
  transactionTemplates: [],
  incomeTemplates: [],
  targets: [],
});

describe("buildBackup", () => {
  it("wraps the data with an app marker, version and timestamp", () => {
    const backup = buildBackup([budget(1)], [], new Date("2026-10-09T10:00:00Z"));
    expect(backup).toMatchObject({
      app: "hisaab",
      version: 1,
      exportedAt: "2026-10-09T10:00:00.000Z",
    });
    expect(backup.budgets).toHaveLength(1);
  });
});

describe("summarizeBackup", () => {
  it("counts budgets, transactions and portfolios", () => {
    const backup = buildBackup([budget(3), budget(4)], [{ portfolio: {}, assetClasses: [], holdings: [], holdingValueHistory: [] }]);
    expect(summarizeBackup(backup)).toEqual({ budgets: 2, transactions: 7, portfolios: 1 });
  });
});

describe("backupFileName", () => {
  it("is dated in local time", () => {
    expect(backupFileName(new Date(2026, 9, 9))).toBe("hisaab-backup-2026-10-09.json");
    expect(backupFileName(new Date(2026, 0, 5))).toBe("hisaab-backup-2026-01-05.json");
  });
});

describe("fetchAllPages", () => {
  it("keeps asking until a short page, so histories over 1000 rows are not cut off", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 3 }, (_, i) => ({ i })), error: null })
      .mockResolvedValueOnce({ data: Array.from({ length: 3 }, (_, i) => ({ i: i + 3 })), error: null })
      .mockResolvedValueOnce({ data: [{ i: 6 }], error: null });

    const rows = await fetchAllPages(fetchPage, 3);

    expect(rows).toHaveLength(7);
    expect(fetchPage.mock.calls).toEqual([
      [0, 2],
      [3, 5],
      [6, 8],
    ]);
  });

  it("stops after one page when it is not full", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: [{ a: 1 }], error: null });
    expect(await fetchAllPages(fetchPage, 1000)).toHaveLength(1);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("surfaces an error rather than returning a partial backup", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } });
    await expect(fetchAllPages(fetchPage)).rejects.toThrow("denied");
  });
});
