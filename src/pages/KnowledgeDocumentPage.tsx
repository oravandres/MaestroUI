import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { fetchDocument } from "@/api/knowledge";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

export function KnowledgeDocumentPage() {
  const { id } = useParams();
  const documentId = id ?? "";
  const documentQuery = useQuery({
    queryKey: ["knowledge-document", documentId],
    queryFn: () => fetchDocument(documentId),
    enabled: documentId !== "",
    retry: false,
  });
  const document = documentQuery.data;

  return (
    <div className="page-container">
      <Link className="back-link" to="/knowledge">
        Knowledge
      </Link>
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">{document?.title ?? "Knowledge document"}</h1>
          <p className="page-subtitle">Document detail and indexing state.</p>
        </div>
        {document ? <StatusBadge status={document.status} /> : null}
      </header>

      {documentQuery.isLoading ? <LoadingState label="Loading document" /> : null}
      {documentQuery.isError ? (
        <ErrorState error={documentQuery.error} onRetry={() => void documentQuery.refetch()} />
      ) : null}

      {document ? (
        <div className="detail-grid">
          <section className="panel">
            <h2>Document</h2>
            <dl className="definition-list">
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={document.status} />
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>
                  {document.source_id ? (
                    <Link to={`/knowledge/sources/${encodeURIComponent(document.source_id)}`}>
                      {document.source_id}
                    </Link>
                  ) : (
                    "Unassigned"
                  )}
                </dd>
              </div>
              <div>
                <dt>URI</dt>
                <dd>{document.uri ?? "Not exposed"}</dd>
              </div>
              <div>
                <dt>Content type</dt>
                <dd>{document.content_type ?? "unknown"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(document.created_at)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDateTime(document.updated_at)}</dd>
              </div>
            </dl>
          </section>
          <section className="panel">
            <h2>Metadata</h2>
            <JsonPreview value={document.metadata} label="Document metadata" />
          </section>
          <section className="panel">
            <h2>Indexing</h2>
            <EmptyState title="Indexing actions deferred">
              Indexing controls will be added after Maestro publishes the document indexing
              response contract.
            </EmptyState>
          </section>
        </div>
      ) : null}
    </div>
  );
}
