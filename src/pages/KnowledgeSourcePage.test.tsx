import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { ApiError } from "@/api/client";
import {
  type KnowledgeDocument,
  type KnowledgeSource,
  fetchDocuments,
  fetchSource,
} from "@/api/knowledge";
import { KnowledgeSourcePage } from "@/pages/KnowledgeSourcePage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/knowledge", () => ({
  fetchDocuments: vi.fn(),
  fetchSource: vi.fn(),
}));

function source(overrides: Partial<KnowledgeSource> = {}): KnowledgeSource {
  return {
    id: "source-1",
    name: "Runbooks",
    type: "markdown",
    status: "created",
    description: "Operational notes",
    metadata: { team: "ops" },
    created_at: "2026-05-11T08:00:00Z",
    updated_at: "2026-05-12T08:00:00Z",
    ...overrides,
  };
}

function document(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    id: "document-1",
    source_id: "source-1",
    title: "Runbook",
    uri: null,
    content_type: "text/markdown",
    status: "pending",
    metadata: {},
    created_at: "2026-05-11T08:00:00Z",
    updated_at: "2026-05-12T08:00:00Z",
    ...overrides,
  };
}

function renderPage(route = "/knowledge/sources/source-1") {
  return renderWithProviders(
    <Routes>
      <Route path="/knowledge/sources/:id" element={<KnowledgeSourcePage />} />
    </Routes>,
    { route }
  );
}

describe("KnowledgeSourcePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSource).mockResolvedValue(source());
    vi.mocked(fetchDocuments).mockResolvedValue({ items: [], pagination: { total: 0 } });
  });

  it("renders source details and metadata", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Runbooks" })).toBeInTheDocument();
    expect(screen.getAllByText("Operational notes")).toHaveLength(2);
    expect(screen.getByText("markdown")).toBeInTheDocument();
    expect(screen.getByLabelText("Source metadata")).toHaveTextContent('"team": "ops"');
  });

  it("renders source and document errors independently", async () => {
    vi.mocked(fetchSource).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );
    vi.mocked(fetchDocuments).mockRejectedValue(new Error("documents failed"));

    renderPage();

    expect(await screen.findByText("This API is not available yet.")).toBeInTheDocument();
    expect(await screen.findByText("documents failed")).toBeInTheDocument();
  });

  it("renders an empty state when no documents are attached", async () => {
    renderPage();

    expect(await screen.findByText("No documents attached")).toBeInTheDocument();
  });

  it("filters documents to the current source and links to document detail", async () => {
    vi.mocked(fetchDocuments).mockResolvedValue({
      items: [document(), document({ id: "document-2", source_id: "other", title: "Other" })],
      pagination: { total: 2 },
    });

    renderPage();

    const table = await screen.findByRole("table", { name: "Source documents" });
    expect(within(table).getByRole("link", { name: "Runbook" })).toHaveAttribute(
      "href",
      "/knowledge/documents/document-1"
    );
    expect(within(table).queryByText("Other")).not.toBeInTheDocument();
  });
});
