import { collapseHistoryByDay } from "./collapse-history";

const row = (as_of: string, value: number, created_at: string) => ({
  as_of,
  value,
  created_at,
});

describe("collapseHistoryByDay", () => {
  it("returns nothing for no rows", () => {
    expect(collapseHistoryByDay([])).toEqual([]);
  });

  it("keeps a single point", () => {
    expect(
      collapseHistoryByDay([row("2026-01-01", 1000, "2026-01-01T08:00:00Z")]),
    ).toEqual([{ date: "2026-01-01", value: 1000 }]);
  });

  it("sorts days oldest-first regardless of input order", () => {
    const out = collapseHistoryByDay([
      row("2026-03-01", 1200, "2026-03-01T08:00:00Z"),
      row("2026-01-01", 1000, "2026-01-01T08:00:00Z"),
      row("2026-02-01", 1100, "2026-02-01T08:00:00Z"),
    ]);
    expect(out.map((p) => p.date)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
  });

  it("collapses same-day entries to the latest by created_at", () => {
    const out = collapseHistoryByDay([
      row("2026-01-01", 1000, "2026-01-01T08:00:00Z"), // seeded at create
      row("2026-01-01", 1250, "2026-01-01T15:30:00Z"), // later same-day update
    ]);
    expect(out).toEqual([{ date: "2026-01-01", value: 1250 }]);
  });

  it("does not let an earlier-created row override a later one", () => {
    const out = collapseHistoryByDay([
      row("2026-01-01", 1250, "2026-01-01T15:30:00Z"),
      row("2026-01-01", 1000, "2026-01-01T08:00:00Z"),
    ]);
    expect(out).toEqual([{ date: "2026-01-01", value: 1250 }]);
  });
});
