import { Link } from "react-router";
import type { RagRun } from "@/api/rag";
import { EmptyState } from "@/components/common/EmptyState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfidenceBadge } from "@/components/rag/ConfidenceBadge";
import { formatDateTime } from "@/utils/format";

const roundKeys = new Set([
  "title",
  "name",
  "round",
  "round_index",
  "step",
  "query",
  "question",
  "queries",
  "status",
]);

export function RagRunDetail({ run }: { run: RagRun }) {
  return (
    <div className="detail-grid">
      <AnswerPanel run={run} />
      <RagPayloadList
        title="Evidence"
        itemLabel="Evidence"
        items={run.evidence}
        emptyTitle="No evidence yet"
      />
      <RagPayloadList
        title="Citations"
        itemLabel="Citation"
        items={run.citations}
        emptyTitle="No citations yet"
      />
      <RetrievalRounds rounds={run.retrieval_rounds} />
      <VerificationPanel
        records={[...run.evidence, ...run.citations, ...run.retrieval_rounds]}
      />
    </div>
  );
}

function AnswerPanel({ run }: { run: RagRun }) {
  return (
    <section className="panel">
      <h2>Answer</h2>
      {run.answer ? <p>{run.answer}</p> : <p className="text-muted">Pending answer</p>}
      <dl className="definition-list">
        <div>
          <dt>Confidence</dt>
          <dd>
            <ConfidenceBadge confidence={run.confidence} />
          </dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{formatDateTime(run.started_at)}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>{formatDateTime(run.completed_at)}</dd>
        </div>
        <div>
          <dt>Conversation</dt>
          <dd>{run.conversation_id ?? "Not linked"}</dd>
        </div>
      </dl>
      {run.error ? <p className="error-text">{run.error}</p> : null}
    </section>
  );
}

function RagPayloadList({
  title,
  itemLabel,
  items,
  emptyTitle,
}: {
  title: string;
  itemLabel: string;
  items: unknown[];
  emptyTitle: string;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {items.length === 0 ? <EmptyState title={emptyTitle} /> : null}
      {items.length > 0 ? (
        <ol className="citation-list">
          {items.map((item, index) => (
            <li key={index}>
              <RagPayloadCard item={item} index={index} itemLabel={itemLabel} />
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function RagPayloadCard({
  item,
  index,
  itemLabel,
}: {
  item: unknown;
  index: number;
  itemLabel: string;
}) {
  if (!isRecord(item)) {
    return <RawPayload item={item} label={`${itemLabel} ${index + 1}`} />;
  }

  const fallbackTitle = `${itemLabel} ${index + 1}`;
  const title = readString(item, "title") ?? readString(item, "source") ?? fallbackTitle;
  const uri = readString(item, "uri");
  const documentId = readString(item, "document_id");
  const chunkId = readString(item, "chunk_id");
  const score = readNumber(item, "score");
  const text =
    readString(item, "text") ?? readString(item, "content") ?? readString(item, "snippet");
  const verificationStatus =
    readString(item, "verification_status") ??
    readString(item, "claim_status") ??
    readString(item, "support_status");
  const href = uri ? safeHref(uri) : undefined;
  const hasKnownFields =
    title !== fallbackTitle ||
    Boolean(uri) ||
    Boolean(documentId) ||
    Boolean(chunkId) ||
    score !== undefined ||
    Boolean(text) ||
    Boolean(verificationStatus);

  if (!hasKnownFields) {
    return <RawPayload item={item} label={`${itemLabel} ${index + 1}`} />;
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
        {score !== undefined ? (
          <StatusBadge status="ok">Score {formatScore(score)}</StatusBadge>
        ) : null}
      </div>
      <div className="tag-list">
        {documentId ? (
          <span className="tag">
            <Link to={`/knowledge/documents/${encodeURIComponent(documentId)}`}>
              Document {documentId}
            </Link>
          </span>
        ) : null}
        {chunkId ? <span className="tag">Chunk {chunkId}</span> : null}
        {uri && !href ? <span className="tag">{uri}</span> : null}
        {verificationStatus ? (
          <StatusBadge status={verificationTone(verificationStatus)}>
            {formatLabel(verificationStatus)}
          </StatusBadge>
        ) : null}
      </div>
      {text ? <p>{text}</p> : null}
      <details>
        <summary>Raw {itemLabel.toLowerCase()} payload</summary>
        <JsonPreview value={item} label={`Raw ${itemLabel.toLowerCase()} payload`} />
      </details>
    </article>
  );
}

function RetrievalRounds({ rounds }: { rounds: unknown[] }) {
  return (
    <section className="panel">
      <h2>Retrieval rounds</h2>
      {rounds.length === 0 ? <EmptyState title="No retrieval rounds yet" /> : null}
      {rounds.length > 0 ? (
        <ol className="citation-list">
          {rounds.map((round, index) => (
            <li key={index}>
              <RetrievalRoundCard round={round} index={index} />
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function RetrievalRoundCard({ round, index }: { round: unknown; index: number }) {
  if (!isRecord(round)) {
    return <RawPayload item={round} label={`Retrieval round ${index + 1}`} />;
  }

  const title =
    readString(round, "title") ??
    readString(round, "name") ??
    formatRoundTitle(round, index);
  const query = readString(round, "query") ?? readString(round, "question");
  const queries = readStringArray(round, "queries");
  const status = readString(round, "status");
  const entries = primitiveEntries(round, roundKeys);

  return (
    <article className="citation-card">
      <div className="card-title-row">
        <h3>{title}</h3>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      {query ? <p>{query}</p> : null}
      {queries.length > 0 ? (
        <div className="tag-list">
          {queries.map((value) => (
            <span className="tag" key={value}>
              {value}
            </span>
          ))}
        </div>
      ) : null}
      {entries.length > 0 ? <MetadataList entries={entries} /> : null}
      <details>
        <summary>Raw retrieval round payload</summary>
        <JsonPreview value={round} label={`Retrieval round ${index + 1} raw payload`} />
      </details>
    </article>
  );
}

function VerificationPanel({ records }: { records: unknown[] }) {
  const items = collectVerificationItems(records);

  return (
    <section className="panel">
      <h2>Verification</h2>
      {items.length === 0 ? (
        <EmptyState title="No verification results yet">
          Maestro has not returned supported claims, unsupported claims, or
          contradictions for this run.
        </EmptyState>
      ) : (
        <ol className="citation-list">
          {items.map((item, index) => (
            <li key={`${item.source}-${item.status}-${index}`}>
              <article className="citation-card">
                <div className="card-title-row">
                  <h3>{item.source}</h3>
                  <StatusBadge status={verificationTone(item.status)}>
                    {formatLabel(item.status)}
                  </StatusBadge>
                </div>
                {item.text ? <p>{item.text}</p> : null}
                {item.payload ? (
                  <details>
                    <summary>Raw verification payload</summary>
                    <JsonPreview
                      value={item.payload}
                      label={`Verification ${index + 1} raw payload`}
                    />
                  </details>
                ) : null}
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function MetadataList({ entries }: { entries: Array<[string, string]> }) {
  return (
    <dl className="metadata-list">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{formatLabel(key)}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RawPayload({ item, label }: { item: unknown; label: string }) {
  return (
    <details className="citation-card">
      <summary>{label} raw payload</summary>
      <JsonPreview value={item} label={`${label} raw payload`} />
    </details>
  );
}

interface VerificationItem {
  source: string;
  status: string;
  text?: string;
  payload?: unknown;
}

function collectVerificationItems(records: unknown[]): VerificationItem[] {
  return records.flatMap((record, index) => {
    if (!isRecord(record)) return [];

    const source =
      readString(record, "title") ??
      readString(record, "query") ??
      readString(record, "question") ??
      `Payload ${index + 1}`;
    const text =
      readString(record, "claim") ??
      readString(record, "statement") ??
      readString(record, "text");
    const items: VerificationItem[] = [];
    const directStatus =
      readString(record, "verification_status") ??
      readString(record, "claim_status") ??
      readString(record, "support_status");

    if (directStatus) {
      items.push({ source, status: directStatus, text, payload: record });
    }

    items.push(...verificationValues(record.supported_claims, "supported", source));
    items.push(...verificationValues(record.unsupported_claims, "unsupported", source));
    items.push(...verificationValues(record.contradictions, "contradiction", source));
    items.push(...verificationValues(record.verification, "verification", source));

    if (typeof record.supported === "boolean") {
      items.push({
        source,
        status: record.supported ? "supported" : "unsupported",
        text,
        payload: record,
      });
    }
    if (record.unsupported === true) {
      items.push({ source, status: "unsupported", text, payload: record });
    }
    if (record.contradiction === true) {
      items.push({ source, status: "contradiction", text, payload: record });
    }

    return items;
  });
}

function verificationValues(
  value: unknown,
  status: string,
  source: string
): VerificationItem[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => verificationValues(item, status, source));
  }
  if (typeof value === "string") {
    const text = value.trim();
    return text ? [{ source, status, text, payload: value }] : [];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [{ source, status, text: String(value), payload: value }];
  }
  if (isRecord(value)) {
    const nestedStatus =
      readString(value, "status") ??
      readString(value, "verification_status") ??
      readString(value, "claim_status") ??
      status;
    const text =
      readString(value, "claim") ??
      readString(value, "statement") ??
      readString(value, "text") ??
      readString(value, "title");
    return [{ source, status: nestedStatus, text, payload: value }];
  }
  return [];
}

function formatRoundTitle(round: Record<string, unknown>, index: number): string {
  const roundNumber =
    readNumber(round, "round") ?? readNumber(round, "round_index") ?? readNumber(round, "step");
  return roundNumber === undefined ? `Round ${index + 1}` : `Round ${roundNumber}`;
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

function readStringArray(source: Record<string, unknown>, key: string): string[] {
  const value = source[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function primitiveEntries(
  value: Record<string, unknown>,
  excludedKeys: Set<string>
): Array<[string, string]> {
  return Object.entries(value)
    .filter(([key, entryValue]) => !excludedKeys.has(key) && isPrimitiveDisplayValue(entryValue))
    .map(([key, entryValue]) => [key, String(entryValue)]);
}

function isPrimitiveDisplayValue(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
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

function verificationTone(status: string): string {
  const normalized = status.toLowerCase();
  if (
    normalized.includes("unsupported") ||
    normalized.includes("contradiction") ||
    normalized.includes("contradicted") ||
    normalized.includes("failed")
  ) {
    return "failed";
  }
  if (
    normalized.includes("partial") ||
    normalized.includes("inconclusive") ||
    normalized.includes("unverified")
  ) {
    return "degraded";
  }
  if (normalized.includes("supported") || normalized.includes("verified")) {
    return "ok";
  }
  return "unknown";
}

function formatScore(score: number): string {
  return score.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatLabel(value: string): string {
  return value.replace(/[_-]+/g, " ");
}
