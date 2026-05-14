import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { SearchCode } from "lucide-react";
import { submitCodeReview } from "@/api/coding";
import { SuggestionList } from "@/components/coding/SuggestionList";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { StatusBadge } from "@/components/common/StatusBadge";

export function CodingPage() {
  const [repository, setRepository] = useState("");
  const [diff, setDiff] = useState("");
  const [goals, setGoals] = useState("Correctness, maintainability, accessibility, and tests.");
  const reviewMutation = useMutation({ mutationFn: submitCodeReview });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (diff.trim() === "") return;
    reviewMutation.mutate({
      repository: repository.trim() || undefined,
      diff: diff.trim(),
      goals: goals.trim(),
    });
  }

  const result = reviewMutation.data;

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Coding Review</h1>
        <p className="page-subtitle">Structured findings, architecture notes, test suggestions, and recommendation state.</p>
      </header>

      <section className="panel">
        <form className="form-grid tool-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Repository</span>
            <input value={repository} onChange={(event) => setRepository(event.target.value)} />
          </label>
          <label className="field field-wide">
            <span>Review goals</span>
            <input value={goals} onChange={(event) => setGoals(event.target.value)} />
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
            Review
          </button>
        </form>
        {reviewMutation.isError ? (
          <ErrorState error={reviewMutation.error} title="Review failed" />
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
              <StatusBadge status={result.status} />
            </div>
            {result.findings.length === 0 ? <EmptyState title="No findings returned" /> : null}
            <div className="card-list">
              {result.findings.map((finding) => (
                <article className="list-card vertical-card" key={finding.id}>
                  <div className="card-title-row">
                    <h3>{finding.title}</h3>
                    <StatusBadge status={finding.severity} />
                  </div>
                  <p>{finding.detail}</p>
                  {finding.file ? (
                    <p className="text-muted">
                      {finding.file}
                      {finding.line ? `:${finding.line}` : ""}
                    </p>
                  ) : null}
                  {finding.recommendation ? <p>{finding.recommendation}</p> : null}
                </article>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>Recommendation</h2>
            <p>{result.final_recommendation}</p>
          </section>
          <SuggestionList
            title="Architecture suggestions"
            itemLabel="Architecture note"
            items={result.architecture_suggestions}
            emptyTitle="No architecture suggestions returned"
          />
          <SuggestionList
            title="Test suggestions"
            itemLabel="Test"
            items={result.test_suggestions}
            emptyTitle="No test suggestions returned"
          />
        </div>
      ) : null}
    </div>
  );
}
