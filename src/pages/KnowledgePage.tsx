import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { fetchDocuments, fetchSources, uploadDocument } from "@/api/knowledge";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

export function KnowledgePage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [file, setFile] = useState<File | null>(null);
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || title.trim() === "") return;
    uploadMutation.mutate({ title: title.trim(), sourceId: sourceId || undefined, file });
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Knowledge</h1>
        <p className="page-subtitle">Sources, documents, uploads, and indexing state.</p>
      </header>

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
                    <h3>{source.name}</h3>
                    <p>{source.type}</p>
                  </div>
                  <StatusBadge status={source.status} />
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
                { key: "title", header: "Title", render: (document) => document.title },
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
