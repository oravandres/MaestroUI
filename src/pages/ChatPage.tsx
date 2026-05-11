import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { createConversation, fetchConversations } from "@/api/chat";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

const chatModes = ["balanced", "fast", "premium", "rag"];

export function ChatPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState(chatModes[0]);
  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    retry: false,
  });
  const createMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (conversation) => {
      void navigate(`/chat/${conversation.id}`);
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate({
      title: title.trim() || "Untitled conversation",
      mode,
    });
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Chat</h1>
        <p className="page-subtitle">Conversations, modes, citations, and message metadata.</p>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>New conversation</h2>
            <p>Start a Maestro-backed chat session.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Conversation title"
            />
          </label>
          <label className="field">
            <span>Mode</span>
            <select value={mode} onChange={(event) => setMode(event.target.value)}>
              {chatModes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-primary" type="submit" disabled={createMutation.isPending}>
            <Plus aria-hidden="true" size={16} />
            Create
          </button>
        </form>
        {createMutation.isError ? (
          <ErrorState error={createMutation.error} title="Conversation could not be created" />
        ) : null}
      </section>

      {conversationsQuery.isLoading ? <LoadingState label="Loading conversations" /> : null}
      {conversationsQuery.isError ? (
        <ErrorState
          error={conversationsQuery.error}
          onRetry={() => void conversationsQuery.refetch()}
        />
      ) : null}
      {conversationsQuery.isSuccess && conversationsQuery.data.items.length === 0 ? (
        <EmptyState title="No conversations yet" />
      ) : null}
      {conversationsQuery.data?.items.length ? (
        <section className="panel">
          <DataTable
            caption="Conversations"
            items={conversationsQuery.data.items}
            getKey={(conversation) => conversation.id}
            columns={[
              {
                key: "title",
                header: "Title",
                render: (conversation) => (
                  <Link to={`/chat/${conversation.id}`}>{conversation.title}</Link>
                ),
              },
              {
                key: "mode",
                header: "Mode",
                render: (conversation) => <StatusBadge status={conversation.mode} />,
              },
              {
                key: "updated",
                header: "Updated",
                render: (conversation) => formatDateTime(conversation.updated_at),
              },
            ]}
          />
        </section>
      ) : null}
    </div>
  );
}
