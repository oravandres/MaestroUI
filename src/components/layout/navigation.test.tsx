import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { renderWithProviders } from "@/test/render";

describe("navigation", () => {
  it("marks the active sidebar route", () => {
    renderWithProviders(<Sidebar />, { route: "/systems" });

    expect(screen.getByRole("link", { name: /systems/i })).toHaveClass("active");
    expect(screen.getByRole("link", { name: /dashboard/i })).not.toHaveClass("active");
  });

  it("opens the mobile menu and closes it after route selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MobileNav />, { route: "/models" });

    await user.click(screen.getByRole("button", { name: /toggle navigation/i }));
    const modelsLink = screen.getByRole("link", { name: /models/i });

    expect(modelsLink).toHaveClass("active");

    await user.click(modelsLink);

    expect(screen.queryByRole("link", { name: /models/i })).not.toBeInTheDocument();
  });
});
