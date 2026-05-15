import { EmptyState } from "@/components/common/EmptyState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { ComparisonResult } from "@/api/reasoning";

interface CompareResultPanelProps {
  result: ComparisonResult;
}

export function CompareResultPanel({ result }: CompareResultPanelProps) {
  const parsed = parseCriteriaResults(result.criteria_results);

  return (
    <article className="result-panel">
      <div className="card-title-row">
        <h3>{result.summary}</h3>
        <StatusBadge status={result.status} />
      </div>
      <dl className="metadata-list">
        {result.winner ? (
          <div>
            <dt>Winner</dt>
            <dd>{result.winner}</dd>
          </div>
        ) : null}
        <div>
          <dt>Confidence</dt>
          <dd>{result.confidence}</dd>
        </div>
      </dl>

      {parsed.options.length > 0 ? (
        <section className="compare-section" aria-label="Option scores">
          <h4>Option scores</h4>
          <table className="compare-matrix">
            <thead>
              <tr>
                <th scope="col">Option</th>
                {parsed.criteriaColumns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
                {parsed.hasWeightedTotal ? <th scope="col">Weighted total</th> : null}
                {parsed.hasRawTotal ? <th scope="col">Total</th> : null}
              </tr>
            </thead>
            <tbody>
              {parsed.options.map((option) => (
                <tr key={option.id}>
                  <th scope="row">
                    {option.label}
                    {option.id === parsed.winnerId ? (
                      <span className="winner-tag" aria-label="Winner">
                        ★
                      </span>
                    ) : null}
                  </th>
                  {parsed.criteriaColumns.map((column) => {
                    const score = option.scoresByCriterion[column];
                    return <td key={column}>{formatScore(score)}</td>;
                  })}
                  {parsed.hasWeightedTotal ? <td>{formatScore(option.weightedTotal)}</td> : null}
                  {parsed.hasRawTotal ? <td>{formatScore(option.rawTotal)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {parsed.criteriaWeights.length > 0 ? (
        <section className="compare-section" aria-label="Criteria weights">
          <h4>Criteria weights</h4>
          <ul className="recommendation-list">
            {parsed.criteriaWeights.map((entry) => (
              <li key={entry.label}>
                <strong>{entry.label}</strong>
                {entry.weight !== undefined ? ` — weight ${formatScore(entry.weight)}` : ""}
                {entry.detail ? ` — ${entry.detail}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {parsed.recommendations.length > 0 ? (
        <section className="compare-section" aria-label="Recommendation">
          <h4>Recommendation</h4>
          {parsed.recommendations.map((entry, index) => (
            <div key={index} className="recommendation-block">
              {entry.text ? <p>{entry.text}</p> : null}
              {entry.caveats.length > 0 ? (
                <ul className="recommendation-list">
                  {entry.caveats.map((caveat, caveatIndex) => (
                    <li key={`${index}-${caveatIndex}-${caveat}`}>{caveat}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {parsed.unknown.length > 0 ? (
        <section className="compare-section" aria-label="Additional comparison details">
          <h4>Additional details</h4>
          <ol className="citation-list">
            {parsed.unknown.map(({ index, value }) => (
              <li key={index}>
                <details className="citation-card">
                  <summary>Comparison detail {index + 1} raw payload</summary>
                  <JsonPreview value={value} label={`Comparison detail ${index + 1} raw payload`} />
                </details>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {parsed.options.length === 0 &&
      parsed.criteriaWeights.length === 0 &&
      parsed.recommendations.length === 0 &&
      parsed.unknown.length === 0 ? (
        <EmptyState title="No comparison details returned" />
      ) : null}
    </article>
  );
}

interface OptionEntry {
  id: string;
  label: string;
  scoresByCriterion: Record<string, number | undefined>;
  weightedTotal?: number;
  rawTotal?: number;
}

interface CriterionWeightEntry {
  label: string;
  weight?: number;
  detail?: string;
}

interface RecommendationEntry {
  text?: string;
  caveats: string[];
}

interface UnknownEntry {
  index: number;
  value: unknown;
}

interface ParsedCriteriaResults {
  options: OptionEntry[];
  criteriaColumns: string[];
  criteriaWeights: CriterionWeightEntry[];
  recommendations: RecommendationEntry[];
  unknown: UnknownEntry[];
  hasWeightedTotal: boolean;
  hasRawTotal: boolean;
  winnerId?: string;
}

function parseCriteriaResults(items: unknown[]): ParsedCriteriaResults {
  const options = new Map<string, OptionEntry>();
  const criteriaColumns = new Set<string>();
  const criteriaWeights: CriterionWeightEntry[] = [];
  const recommendations: RecommendationEntry[] = [];
  const unknown: UnknownEntry[] = [];
  let hasWeightedTotal = false;
  let hasRawTotal = false;

  items.forEach((item, index) => {
    if (!isRecord(item)) {
      unknown.push({ index, value: item });
      return;
    }

    const optionLabel = readString(item, "option") ?? readString(item, "option_name") ?? readString(item, "name");
    const criterionLabel =
      readString(item, "criterion") ??
      readString(item, "criteria") ??
      readString(item, "criterion_name");
    const score = readNumber(item, "score");
    const weightedScore = readNumber(item, "weighted_score") ?? readNumber(item, "weighted");
    const total = readNumber(item, "total");
    const weightedTotal = readNumber(item, "weighted_total");
    const weight = readNumber(item, "weight");
    const breakdown = item.breakdown ?? item.scores;
    const recommendationText =
      readString(item, "recommendation") ??
      readString(item, "reasoning") ??
      readString(item, "rationale");
    const caveats = readCaveats(item);

    let consumed = false;

    // Per-option summary (option + score/total/breakdown)
    if (optionLabel && (score !== undefined || total !== undefined || weightedTotal !== undefined || Array.isArray(breakdown))) {
      const entry = ensureOption(options, optionLabel);
      if (weightedTotal !== undefined) {
        entry.weightedTotal = weightedTotal;
        hasWeightedTotal = true;
      } else if (weightedScore !== undefined && !criterionLabel) {
        entry.weightedTotal = weightedScore;
        hasWeightedTotal = true;
      }
      if (total !== undefined && !criterionLabel) {
        entry.rawTotal = total;
        hasRawTotal = true;
      } else if (score !== undefined && !criterionLabel) {
        entry.rawTotal = score;
        hasRawTotal = true;
      }
      if (Array.isArray(breakdown)) {
        for (const breakdownItem of breakdown) {
          if (!isRecord(breakdownItem)) continue;
          const breakdownCriterion =
            readString(breakdownItem, "criterion") ??
            readString(breakdownItem, "name") ??
            readString(breakdownItem, "label");
          const breakdownScore = readNumber(breakdownItem, "score") ?? readNumber(breakdownItem, "value");
          if (breakdownCriterion && breakdownScore !== undefined) {
            entry.scoresByCriterion[breakdownCriterion] = breakdownScore;
            criteriaColumns.add(breakdownCriterion);
          }
        }
      }
      consumed = true;
    }

    // Flat per-(option, criterion) score row
    if (!consumed && optionLabel && criterionLabel && score !== undefined) {
      const entry = ensureOption(options, optionLabel);
      entry.scoresByCriterion[criterionLabel] = score;
      if (weightedScore !== undefined) {
        entry.weightedTotal = (entry.weightedTotal ?? 0) + weightedScore;
        hasWeightedTotal = true;
      }
      criteriaColumns.add(criterionLabel);
      consumed = true;
    }

    // Per-criterion config with nested scores
    if (!consumed && criterionLabel && Array.isArray(item.scores)) {
      criteriaColumns.add(criterionLabel);
      criteriaWeights.push({ label: criterionLabel, weight, detail: readString(item, "detail") });
      for (const scoreItem of item.scores) {
        if (!isRecord(scoreItem)) continue;
        const scoreOption =
          readString(scoreItem, "option") ??
          readString(scoreItem, "option_name") ??
          readString(scoreItem, "name");
        const scoreValue = readNumber(scoreItem, "score") ?? readNumber(scoreItem, "value");
        if (scoreOption && scoreValue !== undefined) {
          const entry = ensureOption(options, scoreOption);
          entry.scoresByCriterion[criterionLabel] = scoreValue;
        }
      }
      consumed = true;
    }

    // Standalone criterion-with-weight entry
    if (!consumed && criterionLabel && (weight !== undefined || score === undefined)) {
      criteriaWeights.push({
        label: criterionLabel,
        weight,
        detail: readString(item, "detail") ?? readString(item, "description"),
      });
      consumed = true;
    }

    // Recommendation block
    if (!consumed && (recommendationText || caveats.length > 0)) {
      recommendations.push({ text: recommendationText, caveats });
      consumed = true;
    }

    if (!consumed) {
      unknown.push({ index, value: item });
    }
  });

  // Winner detection by best weighted total or raw total
  let winnerId: string | undefined;
  const optionList = Array.from(options.values());
  if (hasWeightedTotal) {
    winnerId = pickWinner(optionList, (entry) => entry.weightedTotal);
  } else if (hasRawTotal) {
    winnerId = pickWinner(optionList, (entry) => entry.rawTotal);
  }

  return {
    options: optionList,
    criteriaColumns: Array.from(criteriaColumns),
    criteriaWeights,
    recommendations,
    unknown,
    hasWeightedTotal,
    hasRawTotal,
    winnerId,
  };
}

function ensureOption(map: Map<string, OptionEntry>, label: string): OptionEntry {
  const id = label.trim().toLowerCase();
  let entry = map.get(id);
  if (!entry) {
    entry = { id, label, scoresByCriterion: {} };
    map.set(id, entry);
  }
  return entry;
}

function pickWinner(
  options: OptionEntry[],
  reader: (entry: OptionEntry) => number | undefined
): string | undefined {
  let bestId: string | undefined;
  let bestScore = -Infinity;
  for (const option of options) {
    const score = reader(option);
    if (score === undefined) continue;
    if (score > bestScore) {
      bestScore = score;
      bestId = option.id;
    }
  }
  return bestId;
}

function formatScore(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
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

function readCaveats(item: Record<string, unknown>): string[] {
  const out: string[] = [];
  const raw = item.caveats;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === "string" && entry.trim() !== "") out.push(entry.trim());
    }
  } else if (typeof raw === "string" && raw.trim() !== "") {
    out.push(raw.trim());
  }
  return out;
}
