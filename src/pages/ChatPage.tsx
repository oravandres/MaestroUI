import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Plus, Trash2 } from "lucide-react";
import {
  type ChatMode,
  type Conversation,
  chatModes,
  createConversation,
  deleteConversation,
  fetchConversations,
} from "@/api/chat";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

export function ChatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<ChatMode>(chatModes[0]);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
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
  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const conversations = conversationsQuery.data?.items ?? [];
  const normalizedSearch = search.trim().toLowerCase();
  const visibleConversations =
    normalizedSearch === ""
      ? conversations
      : conversations.filter((conversation) =>
          `${conversation.title} ${conversation.mode}`.toLowerCase().includes(normalizedSearch)
        );

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
            <select value={mode} onChange={(event) => setMode(event.target.value as ChatMode)}>
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
      {conversations.length ? (
        <section className="panel">
          <label className="field compact-field">
            <span>Search conversations</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or mode"
            />
          </label>
          {visibleConversations.length === 0 ? (
            <EmptyState title="No conversations match your search" />
          ) : (
            <DataTable
              caption="Conversations"
              items={visibleConversations}
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
                {
                  key: "actions",
                  header: "Actions",
                  render: (conversation) => (
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`Delete ${conversation.title}`}
                      onClick={() => {
                        deleteMutation.reset();
                        setDeleteTarget(conversation);
                      }}
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  ),
                },
              ]}
            />
          )}
        </section>
      ) : null}
      {deleteTarget ? (
        <ConfirmDialog
          title="Delete conversation"
          confirmLabel="Delete"
          isBusy={deleteMutation.isPending}
          onCancel={() => {
            deleteMutation.reset();
            setDeleteTarget(null);
          }}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        >
          <p>
            Delete <strong>{deleteTarget.title}</strong>? This removes it from Maestro and cannot
            be undone.
          </p>
          {deleteMutation.isError ? (
            <ErrorState error={deleteMutation.error} title="Conversation could not be deleted" />
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
