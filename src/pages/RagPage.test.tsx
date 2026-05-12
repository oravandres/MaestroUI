import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { ApiError } from "@/api/client";
import { fetchRagRun, fetchRagRuns } from "@/api/rag";
import type { RagRun } from "@/api/rag";
import { ConfidenceBadge } from "@/components/rag/ConfidenceBadge";
import { RagRunPage } from "@/pages/RagRunPage";
import { RagStudioPage } from "@/pages/RagStudioPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/rag", () => ({
  createRagRun: vi.fn(),
  fetchRagRun: vi.fn(),
  fetchRagRuns: vi.fn(),
}));

function makeRun(overrides: Partial<RagRun> = {}): RagRun {
  return {
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
    ...overrides,
  };
}

describe("RAG pages", () => {
  beforeEach(() => {
    vi.mocked(fetchRagRuns).mockResolvedValue({ items: [], pagination: { total: 0 } });
    vi.mocked(fetchRagRun).mockResolvedValue(makeRun());
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

  it("renders RAG run list confidence badges with encoded detail links", async () => {
    vi.mocked(fetchRagRuns).mockResolvedValue({
      items: [
        makeRun({
          id: "rag/with space",
          question: "Where is the runbook?",
          answer: "In knowledge.",
          confidence: "medium",
        }),
      ],
      pagination: { total: 1 },
    });

    renderWithProviders(<RagStudioPage />, { route: "/rag" });

    const link = await screen.findByRole("link", { name: "Where is the runbook?" });
    expect(link).toHaveAttribute("href", "/rag/rag%2Fwith%20space");
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("renders RAG run detail evidence sections", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/rag/:id" element={<RagRunPage />} />
      </Routes>,
      { route: "/rag/rag-1" }
    );

    expect(await screen.findByText("A dashboard was added.")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evidence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Citations" })).toBeInTheDocument();
  });

  it("renders RAG run detail loading state", () => {
    vi.mocked(fetchRagRun).mockReturnValue(new Promise<RagRun>(() => {}));

    renderWithProviders(
      <Routes>
        <Route path="/rag/:id" element={<RagRunPage />} />
      </Routes>,
      { route: "/rag/rag-1" }
    );

    expect(screen.getByText("Loading RAG run")).toBeInTheDocument();
  });

  it("renders RAG run detail errors", async () => {
    vi.mocked(fetchRagRun).mockRejectedValue(
      new ApiError("RAG run unavailable", 500, {
        error: { message: "RAG run unavailable" },
      })
    );

    renderWithProviders(
      <Routes>
        <Route path="/rag/:id" element={<RagRunPage />} />
      </Routes>,
      { route: "/rag/rag-1" }
    );

    expect(await screen.findByText("RAG run unavailable")).toBeInTheDocument();
  });

  it("renders pending answer and empty detail states", async () => {
    vi.mocked(fetchRagRun).mockResolvedValue(
      makeRun({ answer: null, confidence: null, status: "running", completed_at: null })
    );

    renderWithProviders(
      <Routes>
        <Route path="/rag/:id" element={<RagRunPage />} />
      </Routes>,
      { route: "/rag/rag-1" }
    );

    expect(await screen.findByText("Pending answer")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("No evidence yet")).toBeInTheDocument();
    expect(screen.getByText("No retrieval rounds yet")).toBeInTheDocument();
    expect(screen.getByText("No verification results yet")).toBeInTheDocument();
  });

  it("renders structured RAG evidence, citations, retrieval rounds, and verification", async () => {
    vi.mocked(fetchRagRun).mockResolvedValue(
      makeRun({
        retrieval_rounds: [
          {
            round: 1,
            status: "completed",
            query: "phase 7 rag detail",
            duration_ms: 42,
          },
        ],
        evidence: [
          {
            title: "Evidence packet",
            document_id: "doc/1",
            chunk_id: "chunk-1",
            score: 0.87,
            text: "Phase 7 adds structured RAG detail.",
            unsupported_claims: ["Missing support for the deployment claim."],
            contradictions: ["Conflicts with an older runbook."],
          },
        ],
        citations: [
          {
            title: "Ops Runbook",
            uri: "https://docs.example.test/runbook",
            document_id: "doc/1",
            chunk_id: "chunk-2",
            score: 0.92,
            text: "The runbook describes RAG evidence.",
            verification_status: "supported",
          },
          "raw citation text",
        ],
      })
    );

    renderWithProviders(
      <Routes>
        <Route path="/rag/:id" element={<RagRunPage />} />
      </Routes>,
      { route: "/rag/rag-1" }
    );

    expect(await screen.findByText("Phase 7 adds structured RAG detail.")).toBeInTheDocument();
    const documentLinks = screen.getAllByRole("link", { name: "Document doc/1" });
    expect(documentLinks[0]).toHaveAttribute("href", "/knowledge/documents/doc%2F1");
    expect(screen.getByText("Score 0.87")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ops Runbook" })).toHaveAttribute(
      "href",
      "https://docs.example.test/runbook"
    );
    expect(screen.getByText("Citation 2 raw payload")).toBeInTheDocument();
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("phase 7 rag detail")).toBeInTheDocument();
    expect(screen.getAllByText("supported").length).toBeGreaterThan(0);
    expect(screen.getByText("Missing support for the deployment claim.")).toBeInTheDocument();
    expect(screen.getByText("Conflicts with an older runbook.")).toBeInTheDocument();
  });

  it("renders pending and unknown confidence values without throwing", () => {
    renderWithProviders(
      <div>
        <ConfidenceBadge confidence={null} />
        <ConfidenceBadge confidence="experimental" />
      </div>
    );

    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("experimental")).toBeInTheDocument();
  });
});
