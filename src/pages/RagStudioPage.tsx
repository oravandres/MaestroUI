import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Play } from "lucide-react";
import { createRagRun, fetchRagRuns } from "@/api/rag";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfidenceBadge } from "@/components/rag/ConfidenceBadge";
import { formatDateTime } from "@/utils/format";

export function RagStudioPage() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState("");
  const runsQuery = useQuery({
    queryKey: ["rag-runs"],
    queryFn: fetchRagRuns,
    retry: false,
  });
  const createMutation = useMutation({
    mutationFn: createRagRun,
    onSuccess: (run) => {
      void navigate(`/rag/${encodeURIComponent(run.id)}`);
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (question.trim() === "") return;
    createMutation.mutate({
      question: question.trim(),
      conversation_id: conversationId.trim() || undefined,
    });
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">RAG Studio</h1>
        <p className="page-subtitle">Agentic retrieval runs, evidence, citations, and verification state.</p>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Run retrieval</h2>
            <p>Ask a question against Maestro knowledge sources.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field field-wide">
            <span>Question</span>
            <textarea
              rows={3}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Conversation ID</span>
            <input
              value={conversationId}
              onChange={(event) => setConversationId(event.target.value)}
            />
          </label>
          <button
            className="button button-primary"
            type="submit"
            disabled={question.trim() === "" || createMutation.isPending}
          >
            <Play aria-hidden="true" size={16} />
            Run
          </button>
        </form>
        {createMutation.isError ? (
          <ErrorState error={createMutation.error} title="RAG run failed" />
        ) : null}
      </section>

      {runsQuery.isLoading ? <LoadingState label="Loading RAG runs" /> : null}
      {runsQuery.isError ? (
        <ErrorState error={runsQuery.error} onRetry={() => void runsQuery.refetch()} />
      ) : null}
      {runsQuery.isSuccess && runsQuery.data.items.length === 0 ? (
        <EmptyState title="No RAG runs yet" />
      ) : null}
      {runsQuery.data?.items.length ? (
        <section className="panel">
          <DataTable
            caption="RAG runs"
            items={runsQuery.data.items}
            getKey={(run) => run.id}
            columns={[
              {
                key: "question",
                header: "Question",
                render: (run) => (
                  <Link to={`/rag/${encodeURIComponent(run.id)}`}>{run.question}</Link>
                ),
              },
              { key: "status", header: "Status", render: (run) => <StatusBadge status={run.status} /> },
              {
                key: "confidence",
                header: "Confidence",
                render: (run) => <ConfidenceBadge confidence={run.confidence} />,
              },
              { key: "started", header: "Started", render: (run) => formatDateTime(run.started_at) },
            ]}
          />
        </section>
      ) : null}
    </div>
  );
}
