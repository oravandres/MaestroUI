import { EmptyState } from "@/components/common/EmptyState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { StatusBadge } from "@/components/common/StatusBadge";

interface SuggestionListProps {
  title: string;
  itemLabel: string;
  items: unknown[];
  emptyTitle: string;
}

const knownKeys = new Set([
  "title",
  "name",
  "heading",
  "component",
  "area",
  "detail",
  "description",
  "explanation",
  "rationale",
  "reason",
  "summary",
  "recommendation",
  "suggestion",
  "next_step",
  "next_steps",
  "file",
  "path",
  "line",
  "line_number",
  "severity",
  "priority",
  "impact",
]);

export function SuggestionList({ title, itemLabel, items, emptyTitle }: SuggestionListProps) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {items.length === 0 ? <EmptyState title={emptyTitle} /> : null}
      {items.length > 0 ? (
        <ol className="citation-list">
          {items.map((item, index) => (
            <li key={index}>
              <SuggestionCard item={item} index={index} itemLabel={itemLabel} />
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function SuggestionCard({
  item,
  index,
  itemLabel,
}: {
  item: unknown;
  index: number;
  itemLabel: string;
}) {
  if (typeof item === "string") {
    const text = item.trim();
    if (text === "") {
      return <RawPayload item={item} label={`${itemLabel} ${index + 1}`} />;
    }
    return (
      <article className="citation-card">
        <p>{text}</p>
      </article>
    );
  }

  if (!isRecord(item)) {
    return <RawPayload item={item} label={`${itemLabel} ${index + 1}`} />;
  }

  const fallbackTitle = `${itemLabel} ${index + 1}`;
  const title =
    readString(item, "title") ??
    readString(item, "name") ??
    readString(item, "heading") ??
    readString(item, "component") ??
    readString(item, "area") ??
    fallbackTitle;
  const detail =
    readString(item, "detail") ??
    readString(item, "description") ??
    readString(item, "explanation") ??
    readString(item, "rationale") ??
    readString(item, "reason") ??
    readString(item, "summary");
  const recommendations = readRecommendations(item);
  const file = readString(item, "file") ?? readString(item, "path");
  const line = readNumber(item, "line") ?? readNumber(item, "line_number");
  const severity = readString(item, "severity") ?? readString(item, "priority") ?? readString(item, "impact");
  const extraEntries = primitiveEntries(item, knownKeys);

  const hasKnownFields =
    title !== fallbackTitle ||
    Boolean(detail) ||
    recommendations.length > 0 ||
    Boolean(file) ||
    line !== undefined ||
    Boolean(severity) ||
    extraEntries.length > 0;

  if (!hasKnownFields) {
    return <RawPayload item={item} label={fallbackTitle} />;
  }

  return (
    <article className="citation-card">
      <div className="card-title-row">
        <h3>{title}</h3>
        {severity ? <StatusBadge status={severity} /> : null}
      </div>
      {file ? (
        <p className="text-muted">
          {file}
          {line !== undefined ? `:${line}` : ""}
        </p>
      ) : null}
      {detail ? <p>{detail}</p> : null}
      <RecommendationList recommendations={recommendations} />
      {extraEntries.length > 0 ? <MetadataList entries={extraEntries} /> : null}
      <details>
        <summary>Raw {itemLabel.toLowerCase()} payload</summary>
        <JsonPreview value={item} label={`Raw ${itemLabel.toLowerCase()} payload`} />
      </details>
    </article>
  );
}

function RecommendationList({ recommendations }: { recommendations: string[] }) {
  if (recommendations.length === 0) return null;
  if (recommendations.length === 1) return <p>{recommendations[0]}</p>;
  return (
    <ul className="recommendation-list">
      {recommendations.map((entry, index) => (
        <li key={`${index}-${entry}`}>{entry}</li>
      ))}
    </ul>
  );
}

function readRecommendations(item: Record<string, unknown>): string[] {
  const list: string[] = [];
  pushIfNonEmpty(list, readString(item, "recommendation"));
  pushIfNonEmpty(list, readString(item, "suggestion"));
  pushIfNonEmpty(list, readString(item, "next_step"));

  const plural = item.next_steps;
  if (Array.isArray(plural)) {
    for (const entry of plural) {
      if (typeof entry === "string") {
        pushIfNonEmpty(list, entry.trim() || undefined);
      }
    }
  } else if (typeof plural === "string") {
    pushIfNonEmpty(list, plural.trim() || undefined);
  }

  return list;
}

function pushIfNonEmpty(target: string[], value: string | undefined) {
  if (value && !target.includes(value)) target.push(value);
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

function formatLabel(value: string): string {
  return value.replace(/[_-]+/g, " ");
}
