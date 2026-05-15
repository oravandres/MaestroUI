import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

describe("RouteErrorBoundary", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("renders the fallback with the error message when a child throws", () => {
    function Crash(): JSX.Element {
      throw new Error("boom");
    }

    render(
      <RouteErrorBoundary>
        <Crash />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Page failed to load")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();
  });

  it("renders a deploy-friendly message for chunk-load failures", () => {
    function Crash(): JSX.Element {
      throw new Error("Failed to fetch dynamically imported module");
    }

    render(
      <RouteErrorBoundary>
        <Crash />
      </RouteErrorBoundary>
    );

    expect(
      screen.getByText(
        "We couldn't load this page's code. This usually happens after a deploy — reloading the page fixes it."
      )
    ).toBeInTheDocument();
  });

  it("recovers when the user clicks Retry and the child stops throwing", async () => {
    const user = userEvent.setup();

    function Crash(): JSX.Element {
      throw new Error("transient");
    }

    function TestHarness() {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setShouldThrow(false)}>
            Settle
          </button>
          <RouteErrorBoundary>
            {shouldThrow ? <Crash /> : <p>Recovered content</p>}
          </RouteErrorBoundary>
        </>
      );
    }

    render(<TestHarness />);

    expect(screen.getByText("transient")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /settle/i }));
    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
