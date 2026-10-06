import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button tooltips", () => {
  it("names an icon-only button from its aria-label on hover", async () => {
    const user = userEvent.setup();
    render(<Button size="icon" aria-label="Delete rent">x</Button>);
    await user.hover(screen.getByRole("button", { name: "Delete rent" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Delete rent");
  });

  it("falls back to a visually hidden label", async () => {
    const user = userEvent.setup();
    render(
      <Button size="icon">
        <svg />
        <span className="sr-only">Edit Rent</span>
      </Button>,
    );
    await user.hover(screen.getByRole("button", { name: "Edit Rent" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Edit Rent");
  });

  it("leaves buttons with visible text alone, unless asked", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Button>Save</Button>);
    await user.hover(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    rerender(<Button tooltip="Saves your changes">Save</Button>);
    await user.hover(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Saves your changes");
  });
});
