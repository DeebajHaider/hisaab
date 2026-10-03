import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LedgerFilters } from "./ledger-filters";

vi.mock("@/components/ui/date-picker", () => ({ DatePicker: () => <div /> }));

const noop = () => {};
const categories = [{ id: "c1", name: "Monthly Grocery" }, { id: "c2", name: "Vehicle" }];
const items = [{ id: "i1", name: "Rice", category_id: "c1" }, { id: "i2", name: "Petrol", category_id: "c2" }];
const people = [{ id: "p1", name: "Deebaj", is_archived: false }];

function setup(selected: { c?: string[]; i?: string[]; p?: string[] } = {}) {
  const onToggleCategory = vi.fn();
  render(
    <LedgerFilters
      from="2026-10-01"
      to="2026-10-03"
      onFromChange={noop}
      onToChange={noop}
      activePreset={null}
      onPresetSelect={noop}
      categories={categories as never}
      selectedCategoryIds={selected.c ?? []}
      onToggleCategory={onToggleCategory}
      items={items as never}
      selectedItemIds={selected.i ?? []}
      onToggleItem={noop}
      people={people as never}
      selectedPersonIds={selected.p ?? []}
      onTogglePerson={noop}
      search=""
      onSearchChange={noop}
    />,
  );
  return { onToggleCategory, user: userEvent.setup() };
}

describe("Ledger filter sections", () => {
  it("start collapsed, so a long taxonomy takes no room", () => {
    setup();
    for (const name of ["Categories", "Items", "People"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-expanded", "false");
    }
    expect(screen.queryByText("Monthly Grocery")).not.toBeInTheDocument();
    expect(screen.queryByText("Rice")).not.toBeInTheDocument();
    expect(screen.queryByText("Deebaj")).not.toBeInTheDocument();
  });

  it("open on click to reveal the chips, and close again", async () => {
    const { user, onToggleCategory } = setup();

    await user.click(screen.getByRole("button", { name: "Categories" }));
    expect(screen.getByRole("button", { name: "Categories" })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByText("Vehicle"));
    expect(onToggleCategory).toHaveBeenCalledWith("c2");

    await user.click(screen.getByRole("button", { name: "Categories" }));
    expect(screen.queryByText("Vehicle")).not.toBeInTheDocument();
  });

  it("open independently of one another", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Items" }));
    expect(screen.getByText("Rice")).toBeInTheDocument();
    expect(screen.queryByText("Monthly Grocery")).not.toBeInTheDocument();
  });

  it("show how many are selected even while collapsed", () => {
    setup({ c: ["c1", "c2"], p: ["p1"] });
    expect(screen.getByRole("button", { name: /Categories/ })).toHaveTextContent("2 selected");
    expect(screen.getByRole("button", { name: /People/ })).toHaveTextContent("1 selected");
    expect(screen.getByRole("button", { name: /Items/ })).not.toHaveTextContent("selected");
  });
});
