import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { fetchDocuments, fetchSource } from "@/api/knowledge";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime, formatNumber } from "@/utils/format";

export function KnowledgeSourcePage() {
  const { id } = useParams();
  const sourceId = id ?? "";
  const sourceQuery = useQuery({
    queryKey: ["knowledge-source", sourceId],
    queryFn: () => fetchSource(sourceId),
    enabled: sourceId !== "",
    retry: false,
  });
  const documentsQuery = useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: fetchDocuments,
    retry: false,
  });
  const documents = (documentsQuery.data?.items ?? []).filter(
    (document) => document.source_id === sourceId
  );

  return (
    <div className="page-container">
      <Link className="back-link" to="/knowledge">
        Knowledge
      </Link>
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">{sourceQuery.data?.name ?? "Knowledge source"}</h1>
          <p className="page-subtitle">
            {sourceQuery.data?.description ?? "Source detail and attached documents."}
          </p>
        </div>
        {sourceQuery.data ? <StatusBadge status={sourceQuery.data.status} /> : null}
      </header>

      {sourceQuery.isLoading ? <LoadingState label="Loading source" /> : null}
      {sourceQuery.isError ? (
        <ErrorState error={sourceQuery.error} onRetry={() => void sourceQuery.refetch()} />
      ) : null}

      {sourceQuery.data ? (
        <div className="detail-grid">
          <section className="panel">
            <h2>Source</h2>
            <dl className="definition-list">
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={sourceQuery.data.status} />
                </dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{sourceQuery.data.type}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{sourceQuery.data.description ?? "No description"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(sourceQuery.data.created_at)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDateTime(sourceQuery.data.updated_at)}</dd>
              </div>
            </dl>
          </section>
          <section className="panel">
            <h2>Metadata</h2>
            <JsonPreview value={sourceQuery.data.metadata} label="Source metadata" />
          </section>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Documents</h2>
            <p>{formatNumber(documents.length)} attached to this source.</p>
          </div>
        </div>
        {documentsQuery.isLoading ? <LoadingState label="Loading documents" /> : null}
        {documentsQuery.isError ? (
          <ErrorState
            error={documentsQuery.error}
            onRetry={() => void documentsQuery.refetch()}
          />
        ) : null}
        {documentsQuery.isSuccess && documents.length === 0 ? (
          <EmptyState title="No documents attached" />
        ) : null}
        {documents.length ? (
          <DataTable
            caption="Source documents"
            items={documents}
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
  );
}
