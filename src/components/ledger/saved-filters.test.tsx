import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SavedFilters } from "./saved-filters";
import type { SavedLedgerFilter } from "@/lib/saved-ledger-filters";

const saved: SavedLedgerFilter = {
  id: "f1",
  name: "Groceries",
  preset: null,
  from: "2026-01-01",
  to: "2026-10-06",
  categoryIds: [],
  itemIds: [],
  personIds: [],
  search: "",
};

describe("SavedFilters", () => {
  it("renders nothing when there is nothing saved and nothing to save", () => {
    const { container } = render(
      <SavedFilters filters={[]} canSave={false} onApply={vi.fn()} onSave={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("applies and deletes a saved view", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onDelete = vi.fn();
    render(
      <SavedFilters filters={[saved]} canSave={false} onApply={onApply} onSave={vi.fn()} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("button", { name: "Groceries" }));
    expect(onApply).toHaveBeenCalledWith(saved);

    await user.click(screen.getByRole("button", { name: "Delete saved filter Groceries" }));
    expect(onDelete).toHaveBeenCalledWith("f1");
  });

  it("saves the current view under a name", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SavedFilters filters={[]} canSave onApply={vi.fn()} onSave={onSave} onDelete={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /Save this view/ }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.type(screen.getByLabelText("Name this view"), "Fuel");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith("Fuel");
  });
});
