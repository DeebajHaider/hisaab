import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/lib/theme-provider";
import { Landing } from "./landing";

beforeEach(() => {
  // No IntersectionObserver or motion preferences in jsdom: ask for reduced
  // motion so every animated value renders in its final state.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
});

const renderLanding = () =>
  render(
    <MemoryRouter>
      <ThemeProvider>
        <Landing />
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("Landing", () => {
  it("has a single readable headline with every word", () => {
    renderLanding();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("The budgeting tool that fits how your family actually spends.");
  });

  it("sends every call to action to sign-up", () => {
    renderLanding();
    for (const name of [/Get started, it's free/, /^Get started$/]) {
      for (const link of screen.getAllByRole("link", { name })) {
        expect(link).toHaveAttribute("href", "/auth");
      }
    }
    expect(screen.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "#features");
  });

  it("shows the whole feature story, with final values where motion is reduced", () => {
    renderLanding();
    for (const title of [
      "Search-first entry",
      "See the month at a glance",
      "Stay on target",
      "Track trends over time",
      "Built for the whole family",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    // Counters show their final numbers and the search demo its full query.
    expect(screen.getByText("184,250")).toBeInTheDocument();
    expect(screen.getByText("flou")).toBeInTheDocument();
    expect(screen.getByText(/Add “flou” as a new item/)).toBeInTheDocument();
  });

  it("lists the smaller features", () => {
    renderLanding();
    const section = screen.getByRole("heading", { name: /small things/ }).closest("section")!;
    expect(within(section).getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });
});
