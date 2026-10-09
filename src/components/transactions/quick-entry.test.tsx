import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickEntry } from "./quick-entry";

const state = vi.hoisted(() => ({ create: vi.fn(), tracks: false }));

vi.mock("@/queries/use-items", () => ({
  useItems: () => ({
    data: [
      {
        id: "chai",
        name: "Chai",
        category_id: "food",
        category: { id: "food", name: "Food", budget_id: "b1", tracks_person: state.tracks },
      },
    ],
  }),
}));
vi.mock("@/queries/use-transaction-mutations", () => ({
  useCreateTransaction: () => ({ mutateAsync: state.create, isPending: false }),
}));
vi.mock("@/lib/format/date", async (orig) => ({
  ...(await orig<typeof import("@/lib/format/date")>()),
  todayISO: () => "2026-10-09",
}));

beforeEach(() => {
  state.create.mockReset().mockResolvedValue(undefined);
  state.tracks = false;
});

const box = () => screen.getByLabelText("Quick entry");

describe("QuickEntry", () => {
  it("previews what it understood and saves it on Enter, then clears", async () => {
    const user = userEvent.setup();
    render(<QuickEntry budgetId="b1" date="2026-10-05" currency="PKR" />);

    await user.type(box(), "chai 120 #tea");
    expect(screen.getByRole("status")).toHaveTextContent("Press Enter to add Chai (Food)");
    expect(screen.getByRole("status")).toHaveTextContent("PKR 120.00");
    expect(screen.getByRole("status")).toHaveTextContent("#tea");

    await user.keyboard("{Enter}");

    expect(state.create).toHaveBeenCalledWith({
      budgetId: "b1",
      categoryId: "food",
      itemId: "chai",
      date: "2026-10-05",
      amount: 120,
      tags: ["tea"],
    });
    expect(box()).toHaveValue("");
  });

  it("does not save, and says why, when it cannot understand the line", async () => {
    const user = userEvent.setup();
    render(<QuickEntry budgetId="b1" date="2026-10-05" currency="PKR" />);

    await user.type(box(), "zzz 50{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("No item matches “zzz”.");
    expect(state.create).not.toHaveBeenCalled();
  });

  it("sends categories that track people to the full form", async () => {
    state.tracks = true;
    const user = userEvent.setup();
    render(<QuickEntry budgetId="b1" date="2026-10-05" currency="PKR" />);

    await user.type(box(), "chai 120{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("needs a person");
    expect(state.create).not.toHaveBeenCalled();
  });

  it("keeps what was typed if saving fails", async () => {
    state.create.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    render(<QuickEntry budgetId="b1" date="2026-10-05" currency="PKR" />);

    await user.type(box(), "chai 120{Enter}");
    expect(box()).toHaveValue("chai 120");
  });
});
