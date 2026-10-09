import { render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollToTop } from "./scroll-to-top";

let go: (to: string) => void = () => {};
function Nav() {
  go = useNavigate();
  return null;
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe("ScrollToTop", () => {
  it("scrolls to the top on arrival and whenever the path changes", () => {
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <ScrollToTop />
        <Nav />
      </MemoryRouter>,
    );
    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    act(() => go("/b"));
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
  });

  it("stays put when only the query string changes", () => {
    render(
      <MemoryRouter initialEntries={["/ledger"]}>
        <ScrollToTop />
        <Nav />
      </MemoryRouter>,
    );
    act(() => go("/ledger?item=1"));
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });
});
