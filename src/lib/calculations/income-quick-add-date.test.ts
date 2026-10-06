import { describe, expect, it } from "vitest";
import { incomeQuickAddDate } from "./income-quick-add-date";

describe("incomeQuickAddDate", () => {
  it("is today when viewing the current month", () => {
    expect(incomeQuickAddDate("2026-10", "2026-10-06")).toBe("2026-10-06");
  });

  it("is the 1st of the month when viewing another month", () => {
    expect(incomeQuickAddDate("2026-09", "2026-10-06")).toBe("2026-09-01");
    expect(incomeQuickAddDate("2025-10", "2026-10-06")).toBe("2025-10-01");
  });
});
