import { blendHistoryOverTime } from "./portfolio-history";

interface Row {
  holding_id: string;
  as_of: string;
  value: number;
  created_at: string;
}

function row(overrides: Partial<Row> & { holding_id: string; as_of: string; value: number }): Row {
  return { created_at: `${overrides.as_of}T00:00:00Z`, ...overrides };
}

describe("blendHistoryOverTime", () => {
  it("returns empty for no rows", () => {
    expect(blendHistoryOverTime([], {}, {}, "PKR")).toEqual([]);
  });

  it("a single holding with one point produces one date", () => {
    const rows = [row({ holding_id: "h1", as_of: "2026-01-01", value: 1000 })];
    expect(blendHistoryOverTime(rows, { h1: "PKR" }, {}, "PKR")).toEqual([
      { date: "2026-01-01", value: 1000 },
    ]);
  });

  it("carries forward a holding's last known value on dates another holding updates", () => {
    const rows = [
      row({ holding_id: "h1", as_of: "2026-01-01", value: 1000 }),
      row({ holding_id: "h2", as_of: "2026-01-01", value: 500 }),
      row({ holding_id: "h2", as_of: "2026-01-10", value: 600 }),
    ];
    // h1 never updates again — its 1000 should carry forward to Jan 10.
    expect(blendHistoryOverTime(rows, { h1: "PKR", h2: "PKR" }, {}, "PKR")).toEqual([
      { date: "2026-01-01", value: 1500 },
      { date: "2026-01-10", value: 1600 },
    ]);
  });

  it("excludes a holding from dates before its first recorded point", () => {
    const rows = [
      row({ holding_id: "h1", as_of: "2026-01-01", value: 1000 }),
      row({ holding_id: "h2", as_of: "2026-01-15", value: 500 }),
    ];
    expect(blendHistoryOverTime(rows, { h1: "PKR", h2: "PKR" }, {}, "PKR")).toEqual([
      { date: "2026-01-01", value: 1000 },
      { date: "2026-01-15", value: 1500 },
    ]);
  });

  it("collapses same-day entries to the latest by created_at, matching collapseHistoryByDay", () => {
    const rows = [
      row({ holding_id: "h1", as_of: "2026-01-01", value: 100, created_at: "2026-01-01T08:00:00Z" }),
      row({ holding_id: "h1", as_of: "2026-01-01", value: 150, created_at: "2026-01-01T18:00:00Z" }),
    ];
    expect(blendHistoryOverTime(rows, { h1: "PKR" }, {}, "PKR")).toEqual([
      { date: "2026-01-01", value: 150 },
    ]);
  });

  it("converts a foreign currency using the supplied rate", () => {
    const rows = [
      row({ holding_id: "h1", as_of: "2026-01-01", value: 1000 }), // PKR
      row({ holding_id: "h2", as_of: "2026-01-01", value: 10 }), // USD
    ];
    expect(
      blendHistoryOverTime(rows, { h1: "PKR", h2: "USD" }, { USD: 280 }, "PKR"),
    ).toEqual([{ date: "2026-01-01", value: 1000 + 10 * 280 }]);
  });

  it("excludes a holding's currency from the total when no rate is supplied", () => {
    const rows = [
      row({ holding_id: "h1", as_of: "2026-01-01", value: 1000 }), // PKR
      row({ holding_id: "h2", as_of: "2026-01-01", value: 10 }), // USD, no rate given
    ];
    expect(blendHistoryOverTime(rows, { h1: "PKR", h2: "USD" }, {}, "PKR")).toEqual([
      { date: "2026-01-01", value: 1000 },
    ]);
  });
});
