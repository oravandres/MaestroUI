import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Brain, GitCompare } from "lucide-react";
import { analyzeReasoning, compareReasoning } from "@/api/reasoning";
import { ErrorState } from "@/components/common/ErrorState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CompareResultPanel } from "@/components/reasoning/CompareResultPanel";

export function ReasoningPage() {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [criteria, setCriteria] = useState("");
  const analyzeMutation = useMutation({ mutationFn: analyzeReasoning });
  const compareMutation = useMutation({ mutationFn: compareReasoning });

  function submitAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (prompt.trim() === "") return;
    analyzeMutation.mutate({ prompt: prompt.trim(), context: context.trim() || undefined });
  }

  function submitCompare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (optionA.trim() === "" || optionB.trim() === "" || criteria.trim() === "") return;
    compareMutation.mutate({
      option_a: optionA.trim(),
      option_b: optionB.trim(),
      criteria: criteria.trim(),
    });
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Reasoning</h1>
        <p className="page-subtitle">Analyze and compare workflows with structured confidence output.</p>
      </header>

      <div className="detail-grid">
        <section className="panel">
          <h2>Analyze</h2>
          <form className="form-grid tool-form" onSubmit={submitAnalyze}>
            <label className="field field-full">
              <span>Prompt</span>
              <textarea rows={5} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            </label>
            <label className="field field-full">
              <span>Context</span>
              <textarea rows={3} value={context} onChange={(event) => setContext(event.target.value)} />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={prompt.trim() === "" || analyzeMutation.isPending}
            >
              <Brain aria-hidden="true" size={16} />
              Analyze
            </button>
          </form>
          {analyzeMutation.isError ? (
            <ErrorState error={analyzeMutation.error} title="Analysis failed" />
          ) : null}
          {analyzeMutation.data ? (
            <ResultPanel
              title={analyzeMutation.data.conclusion}
              status={analyzeMutation.data.status}
              confidence={analyzeMutation.data.confidence}
              payload={{ steps: analyzeMutation.data.steps, risks: analyzeMutation.data.risks }}
            />
          ) : null}
        </section>

        <section className="panel">
          <h2>Compare</h2>
          <form className="form-grid tool-form" onSubmit={submitCompare}>
            <label className="field field-full">
              <span>Option A</span>
              <textarea rows={3} value={optionA} onChange={(event) => setOptionA(event.target.value)} />
            </label>
            <label className="field field-full">
              <span>Option B</span>
              <textarea rows={3} value={optionB} onChange={(event) => setOptionB(event.target.value)} />
            </label>
            <label className="field field-full">
              <span>Criteria</span>
              <input value={criteria} onChange={(event) => setCriteria(event.target.value)} />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={
                optionA.trim() === "" ||
                optionB.trim() === "" ||
                criteria.trim() === "" ||
                compareMutation.isPending
              }
            >
              <GitCompare aria-hidden="true" size={16} />
              Compare
            </button>
          </form>
          {compareMutation.isError ? (
            <ErrorState error={compareMutation.error} title="Comparison failed" />
          ) : null}
          {compareMutation.data ? (
            <CompareResultPanel result={compareMutation.data} />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ResultPanel({
  title,
  status,
  confidence,
  payload,
}: {
  title: string;
  status: string;
  confidence: string;
  payload: unknown;
}) {
  return (
    <article className="result-panel">
      <div className="card-title-row">
        <h3>{title}</h3>
        <StatusBadge status={status} />
      </div>
      <p>Confidence: {confidence}</p>
      <JsonPreview value={payload} />
    </article>
  );
}
