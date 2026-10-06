import { describe, expect, it } from "vitest";
import type { TransactionWithRelations } from "@/queries/use-transactions";
import { planMove, planSetPerson, toggleGroup, toggleSelection } from "./bulk-edit";

function tx(over: { person_id?: string | null; tracks?: boolean } = {}): TransactionWithRelations {
  return {
    id: "t",
    person_id: over.person_id ?? null,
    category: { id: "c", name: "C", tracks_person: over.tracks ?? false },
  } as unknown as TransactionWithRelations;
}

describe("toggleSelection", () => {
  it("adds then removes an id without mutating the original", () => {
    const empty = new Set<string>();
    const one = toggleSelection(empty, "a");
    expect([...one]).toEqual(["a"]);
    expect(empty.size).toBe(0);
    expect(toggleSelection(one, "a").size).toBe(0);
  });
});

describe("toggleGroup", () => {
  it("selects the whole group when only some or none are selected", () => {
    expect([...toggleGroup(new Set(["a"]), ["a", "b", "c"])].sort()).toEqual(["a", "b", "c"]);
    expect([...toggleGroup(new Set(), ["a", "b"])].sort()).toEqual(["a", "b"]);
  });

  it("clears the group when it was already fully selected, keeping other days", () => {
    const next = toggleGroup(new Set(["a", "b", "z"]), ["a", "b"]);
    expect([...next]).toEqual(["z"]);
  });

  it("does nothing for an empty group", () => {
    expect(toggleGroup(new Set(["a"]), []).size).toBe(1);
  });
});

describe("planMove", () => {
  const plain = { itemId: "i", categoryId: "c2", tracksPerson: false };
  const tracked = { itemId: "i", categoryId: "c2", tracksPerson: true };

  it("clears the person when the new category does not track people", () => {
    expect(planMove([tx({ person_id: "p1" })], plain, null)).toEqual({
      ok: true,
      patch: { category_id: "c2", item_id: "i", person_id: null },
    });
  });

  it("sets the chosen person for a category that tracks people", () => {
    expect(planMove([tx()], tracked, "p9")).toEqual({
      ok: true,
      patch: { category_id: "c2", item_id: "i", person_id: "p9" },
    });
  });

  it("keeps each row's own person when all already have one", () => {
    const result = planMove([tx({ person_id: "p1" }), tx({ person_id: "p2" })], tracked, null);
    expect(result).toEqual({ ok: true, patch: { category_id: "c2", item_id: "i" } });
  });

  it("asks for a person when some rows have none", () => {
    const result = planMove([tx({ person_id: "p1" }), tx()], tracked, null);
    expect(result.ok).toBe(false);
  });
});

describe("planSetPerson", () => {
  it("applies when every row's category tracks people", () => {
    expect(planSetPerson([tx({ tracks: true }), tx({ tracks: true })], "p1")).toEqual({
      ok: true,
      patch: { person_id: "p1" },
    });
  });

  it("refuses when any row is in a category that does not", () => {
    expect(planSetPerson([tx({ tracks: true }), tx({ tracks: false })], "p1").ok).toBe(false);
  });

  it("refuses an empty selection", () => {
    expect(planSetPerson([], "p1").ok).toBe(false);
  });
});
