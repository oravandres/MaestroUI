import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import * as navigation from "@/components/layout/navigation";
import { renderWithProviders } from "@/test/render";

describe("navigation", () => {
  let prefetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    prefetchSpy = vi.spyOn(navigation, "prefetchRoute").mockImplementation(() => {});
  });

  afterEach(() => {
    prefetchSpy.mockRestore();
  });

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

  it("prefetches the route chunk when a sidebar link is hovered", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />, { route: "/" });

    await user.hover(screen.getByRole("link", { name: /chat/i }));

    expect(prefetchSpy).toHaveBeenCalledWith("/chat");
  });

  it("prefetches the route chunk when a sidebar link is keyboard-focused", () => {
    renderWithProviders(<Sidebar />, { route: "/" });

    screen.getByRole("link", { name: /reasoning/i }).focus();

    expect(prefetchSpy).toHaveBeenCalledWith("/reasoning");
  });
});
