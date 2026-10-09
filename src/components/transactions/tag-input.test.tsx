import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TagInput } from "./tag-input";

function Harness({ initial = [] as string[], suggestions = [] as string[], onSubmit = vi.fn() }) {
  const [tags, setTags] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <TagInput id="t" value={tags} onChange={setTags} suggestions={suggestions} />
      <output data-testid="tags">{tags.join("|")}</output>
    </form>
  );
}

describe("TagInput", () => {
  it("adds a normalised tag on Enter without submitting the surrounding form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Tags (optional)"), "#Trip{Enter}");

    expect(screen.getByTestId("tags")).toHaveTextContent("trip");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("adds on comma and ignores duplicates", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText("Tags (optional)");

    await user.type(input, "work,");
    await user.type(input, "Work,");

    expect(screen.getByTestId("tags")).toHaveTextContent(/^work$/);
  });

  it("removes a tag with its button or with Backspace on an empty box", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["a", "b", "c"]} />);

    await user.click(screen.getByRole("button", { name: "Remove tag b" }));
    expect(screen.getByTestId("tags")).toHaveTextContent("a|c");

    await user.click(screen.getByLabelText("Tags (optional)"));
    await user.keyboard("{Backspace}");
    expect(screen.getByTestId("tags")).toHaveTextContent(/^a$/);
  });

  it("offers tags used before, skipping the ones already applied", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["trip"]} suggestions={["trip", "gift", "work"]} />);

    expect(screen.queryByRole("button", { name: "trip" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "gift" }));
    expect(screen.getByTestId("tags")).toHaveTextContent("trip|gift");
  });
});
