import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Send, Square } from "lucide-react";
import { type Message, fetchConversation, streamChatMessage } from "@/api/chat";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

const chatModes = ["balanced", "fast", "premium", "rag"];

export function ConversationPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState(chatModes[0]);
  const [streamedText, setStreamedText] = useState("");
  const [sendError, setSendError] = useState<unknown>(null);
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const conversationQuery = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => fetchConversation(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [id]);

  useEffect(() => {
    if (conversationQuery.data?.conversation.mode) {
      setMode(conversationQuery.data.conversation.mode);
    }
  }, [conversationQuery.data?.conversation.mode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || draft.trim() === "") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSending(true);
    setStreamedText("");
    setSendError(null);

    const content = draft.trim();
    setDraft("");

    try {
      await streamChatMessage(
        id,
        { content, mode },
        {
          signal: controller.signal,
          onToken: (token) => setStreamedText((current) => `${current}${token}`),
        }
      );
      await queryClient.invalidateQueries({ queryKey: ["conversation", id] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setStreamedText("");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setDraft(content);
        setSendError(error);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsSending(false);
    }
  }

  function cancelSend() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSending(false);
  }

  const messages = conversationQuery.data?.messages ?? [];

  return (
    <div className="page-container">
      <Link className="back-link" to="/chat">
        Back to chat
      </Link>
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">
            {conversationQuery.data?.conversation.title ?? "Conversation"}
          </h1>
          <p className="page-subtitle">
            {conversationQuery.data ? formatDateTime(conversationQuery.data.conversation.updated_at) : ""}
          </p>
        </div>
        {conversationQuery.data ? <StatusBadge status={conversationQuery.data.conversation.mode} /> : null}
      </header>

      {conversationQuery.isLoading ? <LoadingState label="Loading conversation" /> : null}
      {conversationQuery.isError ? (
        <ErrorState error={conversationQuery.error} onRetry={() => void conversationQuery.refetch()} />
      ) : null}
      {conversationQuery.isSuccess && messages.length === 0 && streamedText === "" ? (
        <EmptyState title="No messages yet" />
      ) : null}

      <section className="panel message-thread" aria-label="Message thread">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {streamedText ? (
          <article className="message-bubble assistant">
            <div className="message-heading">
              <strong>assistant</strong>
              <span>Streaming</span>
            </div>
            <p>{streamedText}</p>
          </article>
        ) : null}
      </section>

      <section className="panel">
        <form className="chat-composer" onSubmit={onSubmit}>
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
          <label className="field field-wide">
            <span>Message</span>
            <textarea
              rows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask Maestro"
            />
          </label>
          <div className="button-row">
            <button
              className="button button-primary"
              type="submit"
              disabled={isSending || draft.trim() === ""}
            >
              <Send aria-hidden="true" size={16} />
              Send
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={!isSending}
              onClick={cancelSend}
            >
              <Square aria-hidden="true" size={16} />
              Stop
            </button>
          </div>
        </form>
        {sendError ? <ErrorState error={sendError} title="Message could not be sent" /> : null}
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <article className={`message-bubble ${message.role}`}>
      <div className="message-heading">
        <strong>{message.role}</strong>
        <span>{formatDateTime(message.created_at)}</span>
      </div>
      <p>{message.content}</p>
      <div className="message-meta">
        {message.model_id ? <StatusBadge status={message.model_id} /> : null}
        {message.system_id ? <StatusBadge status={message.system_id} /> : null}
        {message.mode ? <StatusBadge status={message.mode} /> : null}
      </div>
      {message.sources.length > 0 ? (
        <details>
          <summary>Sources ({message.sources.length})</summary>
          <JsonPreview value={message.sources} label="Message sources" />
        </details>
      ) : null}
      {Object.keys(message.usage).length > 0 || Object.keys(message.metadata).length > 0 ? (
        <details>
          <summary>Metadata</summary>
          <JsonPreview value={{ usage: message.usage, metadata: message.metadata }} />
        </details>
      ) : null}
    </article>
  );
}
