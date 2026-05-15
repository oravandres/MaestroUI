import { EmptyState } from "@/components/common/EmptyState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { ReasoningResult } from "@/api/reasoning";

interface AnalyzeResultPanelProps {
  result: ReasoningResult;
}

export function AnalyzeResultPanel({ result }: AnalyzeResultPanelProps) {
  return (
    <article className="result-panel">
      <div className="card-title-row">
        <h3>{result.conclusion}</h3>
        <StatusBadge status={result.status} />
      </div>
      <dl className="metadata-list">
        <div>
          <dt>Confidence</dt>
          <dd>{result.confidence}</dd>
        </div>
      </dl>

      <section className="compare-section" aria-label="Key points">
        <h4>Key points</h4>
        {result.steps.length === 0 ? (
          <EmptyState title="No key points returned" />
        ) : (
          <ol className="citation-list">
            {result.steps.map((step, index) => (
              <li key={index}>
                <KeyPointCard item={step} index={index} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="compare-section" aria-label="Risks">
        <h4>Risks</h4>
        {result.risks.length === 0 ? (
          <EmptyState title="No risks returned" />
        ) : (
          <ol className="citation-list">
            {result.risks.map((risk, index) => (
              <li key={index}>
                <RiskCard item={risk} index={index} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}

function KeyPointCard({ item, index }: { item: unknown; index: number }) {
  const label = `Key point ${index + 1}`;
  if (typeof item === "string") {
    const trimmed = item.trim();
    if (trimmed === "") return <RawPayload value={item} label={label} />;
    return (
      <article className="citation-card">
        <p>{trimmed}</p>
      </article>
    );
  }
  if (!isRecord(item)) return <RawPayload value={item} label={label} />;

  const title =
    readString(item, "title") ??
    readString(item, "name") ??
    readString(item, "step") ??
    readString(item, "heading");
  const detail =
    readString(item, "detail") ??
    readString(item, "description") ??
    readString(item, "summary") ??
    readString(item, "explanation");
  const evidence = readStringList(item, "evidence");
  const nextSteps = readStringList(item, "next_steps");

  if (!title && !detail && evidence.length === 0 && nextSteps.length === 0) {
    return <RawPayload value={item} label={label} />;
  }

  return (
    <article className="citation-card">
      {title ? <h5>{title}</h5> : null}
      {detail ? <p>{detail}</p> : null}
      {evidence.length > 0 ? (
        <ul className="recommendation-list">
          {evidence.map((entry, evIndex) => (
            <li key={`${evIndex}-${entry}`}>{entry}</li>
          ))}
        </ul>
      ) : null}
      {nextSteps.length > 0 ? (
        <ul className="recommendation-list">
          {nextSteps.map((entry, stepIndex) => (
            <li key={`${stepIndex}-${entry}`}>{entry}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function RiskCard({ item, index }: { item: unknown; index: number }) {
  const label = `Risk ${index + 1}`;
  if (typeof item === "string") {
    const trimmed = item.trim();
    if (trimmed === "") return <RawPayload value={item} label={label} />;
    return (
      <article className="citation-card">
        <p>{trimmed}</p>
      </article>
    );
  }
  if (!isRecord(item)) return <RawPayload value={item} label={label} />;

  const title =
    readString(item, "title") ??
    readString(item, "name") ??
    readString(item, "risk") ??
    readString(item, "heading");
  const detail =
    readString(item, "detail") ??
    readString(item, "description") ??
    readString(item, "summary") ??
    readString(item, "explanation");
  const severity =
    readString(item, "severity") ??
    readString(item, "priority") ??
    readString(item, "impact");
  const mitigation =
    readString(item, "mitigation") ??
    readString(item, "recommendation") ??
    readString(item, "next_step");
  const likelihood = readString(item, "likelihood") ?? readString(item, "probability");

  if (!title && !detail && !severity && !mitigation) {
    return <RawPayload value={item} label={label} />;
  }

  return (
    <article className="citation-card">
      <div className="card-title-row">
        <h5>{title ?? label}</h5>
        {severity ? <StatusBadge status={severity} /> : null}
      </div>
      {detail ? <p>{detail}</p> : null}
      {likelihood ? <p className="text-muted">Likelihood: {likelihood}</p> : null}
      {mitigation ? (
        <p>
          <strong>Mitigation:</strong> {mitigation}
        </p>
      ) : null}
    </article>
  );
}

function RawPayload({ value, label }: { value: unknown; label: string }) {
  return (
    <details className="citation-card">
      <summary>{label} raw payload</summary>
      <JsonPreview value={value} label={`${label} raw payload`} />
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

function readStringList(source: Record<string, unknown>, key: string): string[] {
  const raw = source[key];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}
