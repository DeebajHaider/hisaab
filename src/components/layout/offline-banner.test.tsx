import { act, render, screen } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { OfflineBanner } from "./offline-banner";

afterEach(() => {
  act(() => onlineManager.setOnline(true));
});

describe("OfflineBanner", () => {
  it("is absent while online", () => {
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("appears when the connection drops and says what happens to changes", () => {
    render(<OfflineBanner />);

    act(() => onlineManager.setOnline(false));

    expect(screen.getByRole("status")).toHaveTextContent("You're offline");
    expect(screen.getByRole("status")).toHaveTextContent("keep this tab open");
  });

  it("goes away again on reconnect", () => {
    render(<OfflineBanner />);
    act(() => onlineManager.setOnline(false));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => onlineManager.setOnline(true));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows on first render if already offline", () => {
    onlineManager.setOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
