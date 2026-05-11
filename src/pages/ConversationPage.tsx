import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Send, Square } from "lucide-react";
import {
  type Message,
  chatModes,
  fetchConversation,
  isChatMode,
  streamChatMessage,
} from "@/api/chat";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

export function ConversationPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<string>(chatModes[0]);
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
    const conversationMode = conversationQuery.data?.conversation.mode;
    if (conversationMode) {
      setMode(conversationMode);
    }
  }, [conversationQuery.data?.conversation.mode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || draft.trim() === "") return;

    if (!isChatMode(mode)) {
      setSendError(
        new Error(`Mode "${mode}" is not supported by this UI yet. Select a supported mode before sending.`)
      );
      return;
    }

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
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsSending(false);
      }
    }
  }

  function cancelSend() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSending(false);
  }

  const messages = conversationQuery.data?.messages ?? [];
  const unsupportedMode = mode && !isChatMode(mode) ? mode : undefined;

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
              {unsupportedMode ? (
                <option value={unsupportedMode} disabled>
                  Unsupported: {unsupportedMode}
                </option>
              ) : null}
              {chatModes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {unsupportedMode ? (
              <p className="state-meta">
                Mode "{unsupportedMode}" is not supported by this UI yet. Select a supported mode to
                send.
              </p>
            ) : null}
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
              disabled={isSending || draft.trim() === "" || Boolean(unsupportedMode)}
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
      {message.sources.length > 0 ? (
        <SourceCitations sources={message.sources} />
      ) : null}
      <MessageMetadata message={message} />
    </article>
  );
}

function SourceCitations({ sources }: { sources: unknown[] }) {
  return (
    <details>
      <summary>Citations ({sources.length})</summary>
      <ol className="citation-list">
        {sources.map((source, index) => (
          <li key={index}>
            <SourceCitation source={source} index={index} />
          </li>
        ))}
      </ol>
    </details>
  );
}

function SourceCitation({ source, index }: { source: unknown; index: number }) {
  if (!isRecord(source)) {
    return <RawCitation source={source} index={index} />;
  }

  const title = readString(source, "title") ?? `Source ${index + 1}`;
  const uri = readString(source, "uri");
  const documentId = readString(source, "document_id");
  const chunkId = readString(source, "chunk_id");
  const score = readNumber(source, "score");
  const text = readString(source, "text");
  const href = uri ? safeHref(uri) : undefined;
  const additionalMetadata = additionalCitationMetadata(source);

  if (!uri && !documentId && !chunkId && score === undefined && !text && title === `Source ${index + 1}`) {
    return <RawCitation source={source} index={index} />;
  }

  return (
    <article className="citation-card">
      <div className="card-title-row">
        <h3>
          {href ? (
            <a href={href} target="_blank" rel="noreferrer">
              {title}
            </a>
          ) : (
            title
          )}
        </h3>
        {score !== undefined ? <StatusBadge status="ok">Score {formatScore(score)}</StatusBadge> : null}
      </div>
      <div className="tag-list">
        {documentId ? <span className="tag">Document {documentId}</span> : null}
        {chunkId ? <span className="tag">Chunk {chunkId}</span> : null}
        {uri && !href ? <span className="tag">{uri}</span> : null}
      </div>
      {text ? <p>{text}</p> : null}
      {Object.keys(additionalMetadata).length > 0 ? (
        <details>
          <summary>Additional source metadata</summary>
          <JsonPreview
            value={additionalMetadata}
            label={`Source ${index + 1} additional metadata`}
          />
        </details>
      ) : null}
    </article>
  );
}

function RawCitation({ source, index }: { source: unknown; index: number }) {
  return (
    <details className="citation-card">
      <summary>Source {index + 1} raw payload</summary>
      <JsonPreview value={source} label={`Source ${index + 1} raw payload`} />
    </details>
  );
}

function MessageMetadata({ message }: { message: Message }) {
  const usageEntries = primitiveEntries(message.usage);
  const metadataEntries = primitiveEntries(message.metadata);
  const complexMetadata = Object.fromEntries(
    Object.entries(message.metadata).filter(([, value]) => !isPrimitiveDisplayValue(value))
  );
  const hasDetails =
    usageEntries.length > 0 ||
    metadataEntries.length > 0 ||
    Object.keys(complexMetadata).length > 0;

  return (
    <div className="message-meta">
      {message.model_id ? <StatusBadge status={message.model_id} /> : null}
      {message.system_id ? <StatusBadge status={message.system_id} /> : null}
      {message.mode ? <StatusBadge status={message.mode} /> : null}
      {hasDetails ? (
        <details className="message-metadata-details">
          <summary>Metadata</summary>
          {usageEntries.length > 0 ? <MetadataList title="Usage" entries={usageEntries} /> : null}
          {metadataEntries.length > 0 ? <MetadataList title="Details" entries={metadataEntries} /> : null}
          {Object.keys(complexMetadata).length > 0 ? (
            <JsonPreview value={complexMetadata} label="Complex message metadata" />
          ) : null}
        </details>
      ) : null}
    </div>
  );
}

function MetadataList({
  title,
  entries,
}: {
  title: string;
  entries: Array<[string, string]>;
}) {
  return (
    <section>
      <h3>{title}</h3>
      <dl className="metadata-list">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function readNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function additionalCitationMetadata(source: Record<string, unknown>): Record<string, unknown> {
  const displayedKeys = new Set(["title", "uri", "document_id", "chunk_id", "score", "text"]);
  return Object.fromEntries(Object.entries(source).filter(([key]) => !displayedKeys.has(key)));
}

function safeHref(uri: string): string | undefined {
  if (uri.startsWith("/") || uri.startsWith("#")) return uri;
  try {
    const parsed = new URL(uri);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? uri : undefined;
  } catch {
    return undefined;
  }
}

function formatScore(score: number): string {
  return score.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function primitiveEntries(value: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(value)
    .filter(([, entryValue]) => isPrimitiveDisplayValue(entryValue))
    .map(([key, entryValue]) => [key, String(entryValue)]);
}

function isPrimitiveDisplayValue(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
