import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useRef, useState } from "react";
import { Pencil, Plus, Save, Upload } from "lucide-react";
import { Link } from "react-router";
import {
  type CreateKnowledgeSourceInput,
  type KnowledgeSource,
  type UpdateKnowledgeSourceInput,
  createSource,
  fetchDocuments,
  fetchSources,
  updateSource,
  uploadDocument,
} from "@/api/knowledge";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

const emptyMetadata = "{}";

export function KnowledgePage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editingSourceId, setEditingSourceId] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceDescription, setSourceDescription] = useState("");
  const [sourceMetadata, setSourceMetadata] = useState(emptyMetadata);
  const [sourceValidationError, setSourceValidationError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sourcesQuery = useQuery({
    queryKey: ["knowledge-sources"],
    queryFn: fetchSources,
    retry: false,
  });
  const documentsQuery = useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: fetchDocuments,
    retry: false,
  });
  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: async () => {
      setTitle("");
      setSourceId("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    },
  });
  const sourceMutation = useMutation({
    mutationFn: (request: SourceMutationRequest) => {
      if (request.mode === "create") return createSource(request.input);
      return updateSource(request.id, request.input);
    },
    onSuccess: async () => {
      resetSourceForm();
      await queryClient.invalidateQueries({ queryKey: ["knowledge-sources"] });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || title.trim() === "") return;
    uploadMutation.mutate({ title: title.trim(), sourceId: sourceId || undefined, file });
  }

  function resetSourceForm() {
    setEditingSourceId("");
    setSourceName("");
    setSourceType("");
    setSourceDescription("");
    setSourceMetadata(emptyMetadata);
    setSourceValidationError("");
    sourceMutation.reset();
  }

  function startSourceEdit(source: KnowledgeSource) {
    setEditingSourceId(source.id);
    setSourceName(source.name);
    setSourceType(source.type);
    setSourceDescription(source.description ?? "");
    setSourceMetadata(JSON.stringify(source.metadata, null, 2));
    setSourceValidationError("");
    sourceMutation.reset();
  }

  function onSourceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = sourceName.trim();
    const type = sourceType.trim();
    if (!name || !type) return;

    const metadata = parseMetadata(sourceMetadata);
    if (typeof metadata === "string") {
      setSourceValidationError(metadata);
      return;
    }

    const description = sourceDescription.trim();
    const input: CreateKnowledgeSourceInput | UpdateKnowledgeSourceInput = {
      name,
      type,
      metadata,
      ...(description ? { description } : {}),
    };

    setSourceValidationError("");
    if (editingSourceId) {
      sourceMutation.mutate({ mode: "update", id: editingSourceId, input });
      return;
    }
    sourceMutation.mutate({ mode: "create", input });
  }

  const sourceActionLabel = editingSourceId ? "Save source" : "Create source";

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Knowledge</h1>
        <p className="page-subtitle">Sources, documents, uploads, and indexing state.</p>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{editingSourceId ? "Edit source" : "Create source"}</h2>
            <p>Register a knowledge source for uploaded documents.</p>
          </div>
          {editingSourceId ? (
            <button className="button button-secondary" type="button" onClick={resetSourceForm}>
              <Plus aria-hidden="true" size={16} />
              New source
            </button>
          ) : null}
        </div>
        <form className="form-grid" onSubmit={onSourceSubmit}>
          <label className="field">
            <span>Source name</span>
            <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
          </label>
          <label className="field">
            <span>Source type</span>
            <input value={sourceType} onChange={(event) => setSourceType(event.target.value)} />
          </label>
          <label className="field field-wide">
            <span>Description</span>
            <input
              value={sourceDescription}
              onChange={(event) => setSourceDescription(event.target.value)}
            />
          </label>
          <label className="field field-full">
            <span>Metadata JSON</span>
            <textarea
              rows={4}
              value={sourceMetadata}
              onChange={(event) => setSourceMetadata(event.target.value)}
            />
          </label>
          <button
            className="button button-primary"
            type="submit"
            disabled={
              sourceName.trim() === "" ||
              sourceType.trim() === "" ||
              sourceMutation.isPending
            }
          >
            {editingSourceId ? (
              <Save aria-hidden="true" size={16} />
            ) : (
              <Plus aria-hidden="true" size={16} />
            )}
            {sourceActionLabel}
          </button>
        </form>
        {sourceValidationError ? (
          <div className="state-panel state-panel-error" role="alert">
            <h2>Invalid source metadata</h2>
            <p>{sourceValidationError}</p>
          </div>
        ) : null}
        {sourceMutation.isError ? (
          <ErrorState error={sourceMutation.error} title="Source could not be saved" />
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Upload document</h2>
            <p>Submit a file to the planned indexing endpoint.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>Source</span>
            <select value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
              <option value="">Unassigned</option>
              {sourcesQuery.data?.items.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>File</span>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            className="button button-primary"
            type="submit"
            disabled={!file || title.trim() === "" || uploadMutation.isPending}
          >
            <Upload aria-hidden="true" size={16} />
            Upload
          </button>
        </form>
        {uploadMutation.isError ? (
          <ErrorState error={uploadMutation.error} title="Document upload failed" />
        ) : null}
      </section>

      <div className="detail-grid">
        <section className="panel">
          <h2>Sources</h2>
          {sourcesQuery.isLoading ? <LoadingState label="Loading sources" /> : null}
          {sourcesQuery.isError ? (
            <ErrorState error={sourcesQuery.error} onRetry={() => void sourcesQuery.refetch()} />
          ) : null}
          {sourcesQuery.isSuccess && sourcesQuery.data.items.length === 0 ? (
            <EmptyState title="No knowledge sources" />
          ) : null}
          {sourcesQuery.data?.items.length ? (
            <div className="card-list">
              {sourcesQuery.data.items.map((source) => (
                <article className="list-card" key={source.id}>
                  <div>
                    <h3>
                      <Link to={`/knowledge/sources/${encodeURIComponent(source.id)}`}>
                        {source.name}
                      </Link>
                    </h3>
                    <p>{source.type}</p>
                  </div>
                  <div className="button-row">
                    <StatusBadge status={source.status} />
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => startSourceEdit(source)}
                    >
                      <Pencil aria-hidden="true" size={16} />
                      Edit {source.name}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="panel">
          <h2>Documents</h2>
          {documentsQuery.isLoading ? <LoadingState label="Loading documents" /> : null}
          {documentsQuery.isError ? (
            <ErrorState
              error={documentsQuery.error}
              onRetry={() => void documentsQuery.refetch()}
            />
          ) : null}
          {documentsQuery.isSuccess && documentsQuery.data.items.length === 0 ? (
            <EmptyState title="No documents indexed" />
          ) : null}
          {documentsQuery.data?.items.length ? (
            <DataTable
              caption="Knowledge documents"
              items={documentsQuery.data.items}
              getKey={(document) => document.id}
              columns={[
                {
                  key: "title",
                  header: "Title",
                  render: (document) => (
                    <Link to={`/knowledge/documents/${encodeURIComponent(document.id)}`}>
                      {document.title}
                    </Link>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (document) => <StatusBadge status={document.status} />,
                },
                {
                  key: "content",
                  header: "Type",
                  render: (document) => document.content_type ?? "unknown",
                },
                {
                  key: "updated",
                  header: "Updated",
                  render: (document) => formatDateTime(document.updated_at),
                },
              ]}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

type SourceMutationRequest =
  | { mode: "create"; input: CreateKnowledgeSourceInput }
  | { mode: "update"; id: string; input: UpdateKnowledgeSourceInput };

function parseMetadata(raw: string): Record<string, unknown> | string {
  try {
    const value = raw.trim() === "" ? {} : (JSON.parse(raw) as unknown);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return "Metadata must be a JSON object.";
    }
    return value as Record<string, unknown>;
  } catch {
    return "Metadata must be valid JSON.";
  }
}
