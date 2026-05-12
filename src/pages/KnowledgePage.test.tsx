import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import {
  type KnowledgeDocument,
  type KnowledgeSource,
  createSource,
  fetchDocuments,
  fetchSources,
  updateSource,
  uploadDocument,
} from "@/api/knowledge";
import { KnowledgePage } from "@/pages/KnowledgePage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/knowledge", () => ({
  createSource: vi.fn(),
  fetchDocuments: vi.fn(),
  fetchSources: vi.fn(),
  updateSource: vi.fn(),
  uploadDocument: vi.fn(),
}));

function source(overrides: Partial<KnowledgeSource> = {}): KnowledgeSource {
  return {
    id: "source-1",
    name: "Runbooks",
    type: "markdown",
    status: "created",
    description: null,
    metadata: {},
    created_at: "2026-05-11T08:00:00Z",
    updated_at: "2026-05-11T08:00:00Z",
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
    updated_at: "2026-05-11T08:00:00Z",
    ...overrides,
  };
}

describe("KnowledgePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSources).mockResolvedValue({ items: [], pagination: { total: 0 } });
    vi.mocked(fetchDocuments).mockResolvedValue({ items: [], pagination: { total: 0 } });
    vi.mocked(createSource).mockRejectedValue(new Error("not called"));
    vi.mocked(updateSource).mockRejectedValue(new Error("not called"));
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

  it("keeps upload disabled until a title and file are selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<KnowledgePage />, { route: "/knowledge" });

    const uploadButton = screen.getByRole("button", { name: /^upload$/i });
    expect(uploadButton).toBeDisabled();

    await user.type(screen.getByLabelText(/title/i), "Runbook");

    expect(uploadButton).toBeDisabled();
    expect(vi.mocked(uploadDocument)).not.toHaveBeenCalled();
  });

  it("uploads a document, resets the form, and refreshes documents", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchSources).mockResolvedValue({ items: [source()], pagination: { total: 1 } });
    vi.mocked(uploadDocument).mockResolvedValue(document());
    const { queryClient } = renderWithProviders(<KnowledgePage />, { route: "/knowledge" });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const file = new File(["# Runbook"], "runbook.md", { type: "text/markdown" });

    await screen.findByRole("heading", { name: "Runbooks" });
    await user.type(screen.getByLabelText(/title/i), "Runbook");
    await user.selectOptions(screen.getByLabelText(/^source$/i), "source-1");
    await user.upload(screen.getByLabelText(/file/i), file);
    await user.click(screen.getByRole("button", { name: /^upload$/i }));

    expect(vi.mocked(uploadDocument).mock.calls[0]?.[0]).toEqual({
      title: "Runbook",
      sourceId: "source-1",
      file,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["knowledge-documents"] });
    expect(screen.getByLabelText(/title/i)).toHaveValue("");
    expect(screen.getByLabelText(/^source$/i)).toHaveValue("");
    expect((screen.getByLabelText(/file/i) as HTMLInputElement).files).toHaveLength(0);
  });

  it("keeps upload failures visible", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument).mockRejectedValue(new Error("upload failed"));
    const file = new File(["# Runbook"], "runbook.md", { type: "text/markdown" });

    renderWithProviders(<KnowledgePage />, { route: "/knowledge" });

    await user.type(screen.getByLabelText(/title/i), "Runbook");
    await user.upload(screen.getByLabelText(/file/i), file);
    await user.click(screen.getByRole("button", { name: /^upload$/i }));

    expect(await screen.findByText("Document upload failed")).toBeInTheDocument();
    expect(screen.getByText("upload failed")).toBeInTheDocument();
  });

  it("creates a source and refreshes sources", async () => {
    const user = userEvent.setup();
    vi.mocked(createSource).mockResolvedValue(source());
    const { queryClient } = renderWithProviders(<KnowledgePage />, { route: "/knowledge" });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await user.type(screen.getByLabelText(/source name/i), "Runbooks");
    await user.type(screen.getByLabelText(/source type/i), "markdown");
    fireEvent.change(screen.getByLabelText(/metadata json/i), {
      target: { value: JSON.stringify({ team: "ops" }) },
    });
    await user.click(screen.getByRole("button", { name: /^create source$/i }));

    await waitFor(() => {
      expect(vi.mocked(createSource).mock.calls[0]?.[0]).toEqual({
        name: "Runbooks",
        type: "markdown",
        metadata: { team: "ops" },
      });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["knowledge-sources"] });
  });

  it("prefills source edits, saves updates, and refreshes sources", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchSources).mockResolvedValue({
      items: [source({ description: "Ops docs", metadata: { team: "ops" } })],
      pagination: { total: 1 },
    });
    vi.mocked(updateSource).mockResolvedValue(source({ name: "Runbooks v2" }));
    const { queryClient } = renderWithProviders(<KnowledgePage />, { route: "/knowledge" });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(await screen.findByRole("button", { name: /edit runbooks/i }));

    expect(screen.getByLabelText(/source name/i)).toHaveValue("Runbooks");
    expect(screen.getByLabelText(/source type/i)).toHaveValue("markdown");
    expect(screen.getByLabelText(/description/i)).toHaveValue("Ops docs");
    expect(screen.getByLabelText(/metadata json/i)).toHaveValue(
      JSON.stringify({ team: "ops" }, null, 2)
    );

    await user.clear(screen.getByLabelText(/source name/i));
    await user.type(screen.getByLabelText(/source name/i), "Runbooks v2");
    await user.click(screen.getByRole("button", { name: /^save source$/i }));

    await waitFor(() => {
      expect(vi.mocked(updateSource).mock.calls[0]?.[0]).toBe("source-1");
    });
    expect(vi.mocked(updateSource).mock.calls[0]?.[1]).toEqual({
      name: "Runbooks v2",
      type: "markdown",
      description: "Ops docs",
      metadata: { team: "ops" },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["knowledge-sources"] });
  });

  it("keeps source edit failures visible", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchSources).mockResolvedValue({ items: [source()], pagination: { total: 1 } });
    vi.mocked(updateSource).mockRejectedValue(new Error("save failed"));

    renderWithProviders(<KnowledgePage />, { route: "/knowledge" });

    await user.click(await screen.findByRole("button", { name: /edit runbooks/i }));
    await user.click(screen.getByRole("button", { name: /^save source$/i }));

    expect(await screen.findByText("Source could not be saved")).toBeInTheDocument();
    expect(screen.getByText("save failed")).toBeInTheDocument();
  });

  it("rejects invalid source metadata", async () => {
    const user = userEvent.setup();
    renderWithProviders(<KnowledgePage />, { route: "/knowledge" });

    await user.type(screen.getByLabelText(/source name/i), "Runbooks");
    await user.type(screen.getByLabelText(/source type/i), "markdown");
    fireEvent.change(screen.getByLabelText(/metadata json/i), {
      target: { value: "{bad json" },
    });
    await user.click(screen.getByRole("button", { name: /^create source$/i }));

    expect(await screen.findByText("Metadata must be valid JSON.")).toBeInTheDocument();
    expect(vi.mocked(createSource)).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/metadata json/i), {
      target: { value: "[]" },
    });
    await user.click(screen.getByRole("button", { name: /^create source$/i }));

    expect(await screen.findByText("Metadata must be a JSON object.")).toBeInTheDocument();
    expect(vi.mocked(createSource)).not.toHaveBeenCalled();
  });
});
