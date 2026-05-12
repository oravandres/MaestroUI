import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { ApiError } from "@/api/client";
import { type KnowledgeDocument, fetchDocument } from "@/api/knowledge";
import { KnowledgeDocumentPage } from "@/pages/KnowledgeDocumentPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/knowledge", () => ({
  fetchDocument: vi.fn(),
}));

function document(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    id: "document-1",
    source_id: "source-1",
    title: "Runbook",
    uri: "maestro://knowledge/runbook.md",
    content_type: "text/markdown",
    status: "pending",
    metadata: { team: "ops" },
    created_at: "2026-05-11T08:00:00Z",
    updated_at: "2026-05-12T08:00:00Z",
    ...overrides,
  };
}

function renderPage(route = "/knowledge/documents/document-1") {
  return renderWithProviders(
    <Routes>
      <Route path="/knowledge/documents/:id" element={<KnowledgeDocumentPage />} />
    </Routes>,
    { route }
  );
}

describe("KnowledgeDocumentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDocument).mockResolvedValue(document());
  });

  it("renders document details, metadata, and source link", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Runbook" })).toBeInTheDocument();
    expect(screen.getByText("maestro://knowledge/runbook.md")).toBeInTheDocument();
    expect(screen.getByText("text/markdown")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "source-1" })).toHaveAttribute(
      "href",
      "/knowledge/sources/source-1"
    );
    expect(screen.getByLabelText("Document metadata")).toHaveTextContent('"team": "ops"');
  });

  it("renders an unassigned source state", async () => {
    vi.mocked(fetchDocument).mockResolvedValue(document({ source_id: null }));

    renderPage();

    expect(await screen.findByText("Unassigned")).toBeInTheDocument();
  });

  it("renders document errors", async () => {
    vi.mocked(fetchDocument).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );

    renderPage();

    expect(await screen.findByText("This API is not available yet.")).toBeInTheDocument();
  });

  it("shows indexing as deferred without exposing an action", async () => {
    renderPage();

    expect(await screen.findByText("Indexing actions deferred")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /index/i })).not.toBeInTheDocument();
  });
});
