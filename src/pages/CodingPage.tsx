import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { SearchCode } from "lucide-react";
import {
  type CodingReviewVariant,
  codingReviewVariants,
  submitCodeReview,
} from "@/api/coding";
import { SuggestionList } from "@/components/coding/SuggestionList";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { StatusBadge } from "@/components/common/StatusBadge";

interface CodingVariantOption {
  label: string;
  submitLabel: string;
  defaultInstructions: string;
}

const variantOptions: Record<CodingReviewVariant, CodingVariantOption> = {
  review: {
    label: "Review",
    submitLabel: "Run review",
    defaultInstructions: "Correctness, maintainability, accessibility, and tests.",
  },
  architecture: {
    label: "Architecture",
    submitLabel: "Analyze architecture",
    defaultInstructions: "Architecture boundaries, coupling, data flow, scalability, and operational risk.",
  },
  refactor_plan: {
    label: "Refactor plan",
    submitLabel: "Plan refactor",
    defaultInstructions: "Small safe refactor steps, compatibility risks, test strategy, and rollout order.",
  },
  security_review: {
    label: "Security",
    submitLabel: "Review security",
    defaultInstructions: "Authentication, authorization, input validation, secrets handling, XSS, and data exposure.",
  },
};

export function CodingPage() {
  const [variant, setVariant] = useState<CodingReviewVariant>("review");
  const [repository, setRepository] = useState("");
  const [diff, setDiff] = useState("");
  const [instructions, setInstructions] = useState(variantOptions.review.defaultInstructions);
  const reviewMutation = useMutation({ mutationFn: submitCodeReview });

  function changeVariant(nextVariant: CodingReviewVariant) {
    setInstructions((current) => {
      const currentDefault = variantOptions[variant].defaultInstructions;
      if (current.trim() === "" || current === currentDefault) {
        return variantOptions[nextVariant].defaultInstructions;
      }
      return current;
    });
    setVariant(nextVariant);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (diff.trim() === "") return;
    reviewMutation.mutate({
      variant,
      repository: repository.trim() || undefined,
      diff: diff.trim(),
      instructions: instructions.trim() || undefined,
    });
  }

  const result = reviewMutation.data;

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Coding Review</h1>
        <p className="page-subtitle">Structured findings, architecture notes, test suggestions, and recommendation state.</p>
      </header>

      <div className="tabs" aria-label="Coding review type">
        {codingReviewVariants.map((item) => (
          <button
            className={`tab ${variant === item ? "active" : ""}`}
            type="button"
            aria-pressed={variant === item}
            key={item}
            onClick={() => changeVariant(item)}
          >
            {variantOptions[item].label}
          </button>
        ))}
      </div>

      <section className="panel">
        <form className="form-grid tool-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Repository</span>
            <input value={repository} onChange={(event) => setRepository(event.target.value)} />
          </label>
          <label className="field field-wide">
            <span>Review instructions</span>
            <textarea
              rows={2}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </label>
          <label className="field field-full">
            <span>Diff or patch</span>
            <textarea rows={10} value={diff} onChange={(event) => setDiff(event.target.value)} />
          </label>
          <button
            className="button button-primary"
            type="submit"
            disabled={diff.trim() === "" || reviewMutation.isPending}
          >
            <SearchCode aria-hidden="true" size={16} />
            {variantOptions[variant].submitLabel}
          </button>
        </form>
        {reviewMutation.isError ? (
          <ErrorState
            error={reviewMutation.error}
            title={`${variantOptions[variant].label} failed`}
          />
        ) : null}
      </section>

      {result ? (
        <div className="detail-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Findings</h2>
                <p>{result.findings.length} issues returned.</p>
              </div>
            </div>
            {result.findings.length === 0 ? <EmptyState title="No findings returned" /> : null}
            <div className="card-list">
              {result.findings.map((finding, index) => (
                <article
                  className="list-card vertical-card"
                  key={`${finding.path ?? "finding"}-${finding.line ?? index}-${finding.title}`}
                >
                  <div className="card-title-row">
                    <h3>{finding.title}</h3>
                    <StatusBadge status={finding.severity} />
                  </div>
                  <p>{finding.explanation}</p>
                  {finding.path ? (
                    <p className="text-muted">
                      {finding.path}
                      {finding.line ? `:${finding.line}` : ""}
                    </p>
                  ) : null}
                  {finding.recommendation ? <p>{finding.recommendation}</p> : null}
                </article>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Summary</h2>
                <p>{result.summary}</p>
              </div>
              <StatusBadge status={result.final_recommendation} />
            </div>
          </section>
          <SuggestionList
            title="Architecture notes"
            itemLabel="Architecture note"
            items={result.architecture_notes}
            emptyTitle="No architecture notes returned"
          />
          <SuggestionList
            title="Test suggestions"
            itemLabel="Test"
            items={result.tests_to_add}
            emptyTitle="No test suggestions returned"
          />
        </div>
      ) : null}
    </div>
  );
}
