import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { fetchDocuments, fetchSources, uploadDocument } from "@/api/knowledge";
import { KnowledgePage } from "@/pages/KnowledgePage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/knowledge", () => ({
  fetchDocuments: vi.fn(),
  fetchSources: vi.fn(),
  uploadDocument: vi.fn(),
}));

describe("KnowledgePage", () => {
  beforeEach(() => {
    vi.mocked(fetchSources).mockResolvedValue({ items: [], pagination: { total: 0 } });
    vi.mocked(fetchDocuments).mockResolvedValue({ items: [], pagination: { total: 0 } });
    vi.mocked(uploadDocument).mockRejectedValue(new Error("not called"));
  });

  it("renders empty source and document states", async () => {
    renderWithProviders(<KnowledgePage />, { route: "/knowledge" });

    expect(await screen.findByText("No knowledge sources")).toBeInTheDocument();
    expect(await screen.findByText("No documents indexed")).toBeInTheDocument();
  });

  it("keeps unavailable knowledge endpoints visible and retryable", async () => {
    vi.mocked(fetchDocuments).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );

    renderWithProviders(<KnowledgePage />, { route: "/knowledge" });

    expect(await screen.findByText("This API is not available yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
