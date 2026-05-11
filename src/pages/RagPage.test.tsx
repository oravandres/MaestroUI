import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { ApiError } from "@/api/client";
import { fetchRagRun, fetchRagRuns } from "@/api/rag";
import { RagRunPage } from "@/pages/RagRunPage";
import { RagStudioPage } from "@/pages/RagStudioPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/rag", () => ({
  createRagRun: vi.fn(),
  fetchRagRun: vi.fn(),
  fetchRagRuns: vi.fn(),
}));

describe("RAG pages", () => {
  beforeEach(() => {
    vi.mocked(fetchRagRuns).mockResolvedValue({ items: [], pagination: { total: 0 } });
    vi.mocked(fetchRagRun).mockResolvedValue({
      id: "rag-1",
      conversation_id: null,
      question: "What changed?",
      status: "completed",
      retrieval_rounds: [],
      evidence: [],
      answer: "A dashboard was added.",
      citations: [],
      confidence: "high",
      error: null,
      started_at: "2026-05-11T08:00:00Z",
      completed_at: "2026-05-11T08:01:00Z",
    });
  });

  it("renders the RAG run empty state", async () => {
    renderWithProviders(<RagStudioPage />, { route: "/rag" });

    expect(await screen.findByText("No RAG runs yet")).toBeInTheDocument();
  });

  it("renders unavailable RAG list errors", async () => {
    vi.mocked(fetchRagRuns).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );

    renderWithProviders(<RagStudioPage />, { route: "/rag" });

    expect(await screen.findByText("This API is not available yet.")).toBeInTheDocument();
  });

  it("renders RAG run detail evidence sections", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/rag/:id" element={<RagRunPage />} />
      </Routes>,
      { route: "/rag/rag-1" }
    );

    expect(await screen.findByText("A dashboard was added.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evidence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Citations" })).toBeInTheDocument();
  });
});
