import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TargetAlerts } from "./target-alerts";

const state = vi.hoisted(() => ({ alerts: [] as unknown[] }));
vi.mock("@/queries/use-target-alerts", () => ({ useTargetAlerts: () => state.alerts }));

const alert = (id: string, name: string, spent: number, amount: number, status: string, percent: number) => ({
  target: { id, name, target_amount: amount, start_date: "2026-10-01", end_date: "2026-10-31" },
  spent,
  status,
  percent,
});

const renderIt = () =>
  render(
    <MemoryRouter>
      <TargetAlerts budgetId="b1" date="2026-10-15" currency="PKR" />
    </MemoryRouter>,
  );

beforeEach(() => {
  state.alerts = [];
});

describe("TargetAlerts", () => {
  it("renders nothing when no target needs attention", () => {
    const { container } = renderIt();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows percent used for a target getting close", () => {
    state.alerts = [alert("1", "Food", 3400, 4000, "near", 85)];
    renderIt();

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("85% used")).toBeInTheDocument();
    expect(screen.getByText("PKR 3,400.00 of PKR 4,000.00")).toBeInTheDocument();
  });

  it("shows how far over an overspent target is, with the bar capped at full", () => {
    state.alerts = [alert("2", "Fuel", 6000, 4000, "over", 150)];
    const { container } = renderIt();

    expect(screen.getByText("PKR 2,000.00 over")).toBeInTheDocument();
    expect((container.querySelector("[style]") as HTMLElement).style.width).toBe("100%");
  });

  it("links each alert to the Targets page", () => {
    state.alerts = [alert("1", "Food", 3400, 4000, "near", 85)];
    renderIt();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/app/budgets/b1/targets");
  });
});
