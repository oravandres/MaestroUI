import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Upload, WandSparkles } from "lucide-react";
import { fetchMediaAssets, generateMedia, uploadMedia } from "@/api/media";
import { fetchModels } from "@/api/systems";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

type MediaType = "image" | "video" | "audio";

const mediaTypes: MediaType[] = ["image", "video", "audio"];
const emptyPrompts: Record<MediaType, string> = {
  image: "",
  video: "",
  audio: "",
};

function supportsMediaType(capability: string, type: MediaType): boolean {
  const normalized = capability.toLowerCase();
  return normalized === "media" || normalized === `media.${type}`;
}

export function MediaPage() {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<MediaType>("image");
  const [prompts, setPrompts] = useState<Record<MediaType, string>>(emptyPrompts);
  const [modelId, setModelId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeTypeRef = useRef(activeType);
  const fileRef = useRef<File | null>(file);
  const prompt = prompts[activeType];
  const assetsQuery = useQuery({
    queryKey: ["media-assets", activeType],
    queryFn: () => fetchMediaAssets(activeType),
    retry: false,
  });
  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: fetchModels,
  });
  const generationMutation = useMutation({
    mutationFn: generateMedia,
    onSuccess: async (_data, variables) => {
      setPrompts((current) =>
        current[variables.type] === variables.prompt
          ? { ...current, [variables.type]: "" }
          : current
      );
      await queryClient.invalidateQueries({ queryKey: ["media-assets", variables.type] });
    },
  });
  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: async (_data, variables) => {
      if (activeTypeRef.current === variables.type && fileRef.current === variables.file) {
        fileRef.current = null;
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      await queryClient.invalidateQueries({ queryKey: ["media-assets", variables.type] });
    },
  });

  const mediaModels =
    modelsQuery.data?.items.filter((model) => supportsMediaType(model.capability, activeType)) ?? [];

  useEffect(() => {
    activeTypeRef.current = activeType;
    fileRef.current = null;
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [activeType]);

  useEffect(() => {
    if (modelId === "") return;
    const selected = modelsQuery.data?.items.find((model) => model.id === modelId);
    if (selected && !supportsMediaType(selected.capability, activeType)) {
      setModelId("");
    }
  }, [activeType, modelId, modelsQuery.data?.items]);

  function updatePrompt(value: string) {
    setPrompts((current) => ({ ...current, [activeType]: value }));
  }

  function updateFile(value: File | null) {
    fileRef.current = value;
    setFile(value);
  }

  function changeActiveType(type: MediaType) {
    activeTypeRef.current = type;
    fileRef.current = null;
    setActiveType(type);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function submitGeneration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (prompt.trim() === "") return;
    generationMutation.mutate({
      type: activeType,
      prompt: prompt.trim(),
      model_id: modelId || undefined,
    });
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    uploadMutation.mutate({ type: activeType, file });
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Media Studio</h1>
        <p className="page-subtitle">Image, video, and audio generation with asset status.</p>
      </header>

      <div className="tabs" aria-label="Media type">
        {mediaTypes.map((type) => (
          <button
            className={`tab ${activeType === type ? "active" : ""}`}
            type="button"
            aria-pressed={activeType === type}
            key={type}
            onClick={() => changeActiveType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="detail-grid">
        <section className="panel">
          <h2>Generate {activeType}</h2>
          <form className="form-grid tool-form" onSubmit={submitGeneration}>
            <label className="field">
              <span>Model</span>
              <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
                <option value="">Auto select</option>
                {mediaModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span>Prompt</span>
              <textarea rows={4} value={prompt} onChange={(event) => updatePrompt(event.target.value)} />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={prompt.trim() === "" || generationMutation.isPending}
            >
              <WandSparkles aria-hidden="true" size={16} />
              Generate
            </button>
          </form>
          {generationMutation.data ? (
            <p className="section-summary">
              Job <Link to={`/jobs/${generationMutation.data.job_id}`}>{generationMutation.data.job_id}</Link> is {generationMutation.data.status}.
            </p>
          ) : null}
          {generationMutation.isError ? (
            <ErrorState error={generationMutation.error} title="Generation failed" />
          ) : null}
        </section>

        <section className="panel">
          <h2>Upload {activeType}</h2>
          <form className="form-grid tool-form" onSubmit={submitUpload}>
            <label className="field field-wide">
              <span>File</span>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(event) => updateFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button
              className="button button-secondary"
              type="submit"
              disabled={!file || uploadMutation.isPending}
            >
              <Upload aria-hidden="true" size={16} />
              Upload
            </button>
          </form>
          {uploadMutation.isError ? (
            <ErrorState error={uploadMutation.error} title="Upload failed" />
          ) : null}
          <div className="tag-list">
            {mediaModels.length === 0 ? <span className="tag">No media models available</span> : null}
            {mediaModels.map((model) => (
              <span className="tag" key={model.id}>
                {model.name}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Assets</h2>
        {assetsQuery.isLoading ? <LoadingState label="Loading media assets" /> : null}
        {assetsQuery.isError ? (
          <ErrorState error={assetsQuery.error} onRetry={() => void assetsQuery.refetch()} />
        ) : null}
        {assetsQuery.isSuccess && assetsQuery.data.items.length === 0 ? (
          <EmptyState title="No media assets" />
        ) : null}
        {assetsQuery.data?.items.length ? (
          <div className="asset-grid">
            {assetsQuery.data.items.map((asset) => (
              <article className="asset-card" key={asset.id}>
                <div>
                  <h3>{asset.title}</h3>
                  <p>{formatDateTime(asset.created_at)}</p>
                </div>
                <StatusBadge status={asset.status} />
                {asset.job_id ? <Link to={`/jobs/${asset.job_id}`}>Open job</Link> : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
