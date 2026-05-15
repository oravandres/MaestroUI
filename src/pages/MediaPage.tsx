import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Mic, WandSparkles } from "lucide-react";
import { fetchMediaAssets, generateMedia, uploadMedia } from "@/api/media";
import { fetchJob, isActiveJobStatus } from "@/api/jobs";
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

function supportsMediaGeneration(capability: string, type: MediaType): boolean {
  const normalized = capability.toLowerCase();
  if (normalized === "media" || normalized === type || normalized === `media.${type}`) {
    return true;
  }
  return type === "audio" && normalized === "audio.tts";
}

function supportsAudioTranscription(capability: string): boolean {
  const normalized = capability.toLowerCase();
  return (
    normalized === "media" ||
    normalized === "audio" ||
    normalized === "media.audio" ||
    normalized === "audio.asr"
  );
}

export function MediaPage() {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<MediaType>("image");
  const [prompts, setPrompts] = useState<Record<MediaType, string>>(emptyPrompts);
  const [modelId, setModelId] = useState("");
  const [ttsVoice, setTtsVoice] = useState("");
  const [ttsStyle, setTtsStyle] = useState("");
  const [ttsLanguage, setTtsLanguage] = useState("");
  const [asrModelId, setAsrModelId] = useState("");
  const [asrLanguage, setAsrLanguage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const [uploadJobId, setUploadJobId] = useState<string | null>(null);
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
    onSuccess: async (data, variables) => {
      setPrompts((current) =>
        current[variables.type] === variables.prompt
          ? { ...current, [variables.type]: "" }
          : current
      );
      setGenerationJobId(data.job_id);
      await queryClient.invalidateQueries({ queryKey: ["media-assets", variables.type] });
    },
  });
  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: async (data, variables) => {
      if (activeTypeRef.current === variables.type && fileRef.current === variables.file) {
        fileRef.current = null;
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      setUploadJobId(data.job_id);
      await queryClient.invalidateQueries({ queryKey: ["media-assets", variables.type] });
    },
  });

  const generationModels =
    modelsQuery.data?.items.filter((model) =>
      supportsMediaGeneration(model.capability, activeType)
    ) ?? [];
  const transcriptionModels =
    modelsQuery.data?.items.filter((model) => supportsAudioTranscription(model.capability)) ??
    [];

  useEffect(() => {
    activeTypeRef.current = activeType;
    fileRef.current = null;
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [activeType]);

  useEffect(() => {
    if (modelId === "") return;
    const selected = modelsQuery.data?.items.find((model) => model.id === modelId);
    if (selected && !supportsMediaGeneration(selected.capability, activeType)) {
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
      voice: activeType === "audio" && ttsVoice.trim() ? ttsVoice.trim() : undefined,
      style: activeType === "audio" && ttsStyle.trim() ? ttsStyle.trim() : undefined,
      language: activeType === "audio" && ttsLanguage.trim() ? ttsLanguage.trim() : undefined,
    });
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeType !== "audio" || !file) return;
    uploadMutation.mutate({
      type: "audio",
      file,
      model_id: asrModelId || undefined,
      language: asrLanguage.trim() || undefined,
    });
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
          <h2>{activeType === "audio" ? "Generate audio" : `Generate ${activeType}`}</h2>
          <form
            className="form-grid tool-form"
            onSubmit={submitGeneration}
            aria-label={activeType === "audio" ? "Generate audio" : `Generate ${activeType}`}
          >
            <label className="field">
              <span>Model</span>
              <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
                <option value="">Auto select</option>
                {generationModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span>{activeType === "audio" ? "Text" : "Prompt"}</span>
              <textarea rows={4} value={prompt} onChange={(event) => updatePrompt(event.target.value)} />
            </label>
            {activeType === "audio" ? (
              <>
                <label className="field">
                  <span>Voice</span>
                  <input
                    value={ttsVoice}
                    placeholder="e.g. narrator"
                    onChange={(event) => setTtsVoice(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Style</span>
                  <input
                    value={ttsStyle}
                    placeholder="e.g. calm"
                    onChange={(event) => setTtsStyle(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Language</span>
                  <input
                    value={ttsLanguage}
                    placeholder="e.g. en"
                    onChange={(event) => setTtsLanguage(event.target.value)}
                  />
                </label>
              </>
            ) : null}
            <button
              className="button button-primary"
              type="submit"
              disabled={prompt.trim() === "" || generationMutation.isPending}
            >
              <WandSparkles aria-hidden="true" size={16} />
              Generate
            </button>
          </form>
          {generationJobId ? (
            <InlineJobStatus
              jobId={generationJobId}
              fallbackStatus={generationMutation.data?.status ?? "queued"}
            />
          ) : null}
          {generationMutation.isError ? (
            <ErrorState error={generationMutation.error} title="Generation failed" />
          ) : null}
        </section>

        <section className="panel">
          {activeType === "audio" ? (
            <>
              <h2>Transcribe audio</h2>
              <form
                className="form-grid tool-form"
                onSubmit={submitUpload}
                aria-label="Transcribe audio"
              >
                <label className="field">
                  <span>Model</span>
                  <select value={asrModelId} onChange={(event) => setAsrModelId(event.target.value)}>
                    <option value="">Auto select</option>
                    {transcriptionModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Language</span>
                  <input
                    value={asrLanguage}
                    placeholder="e.g. en"
                    onChange={(event) => setAsrLanguage(event.target.value)}
                  />
                </label>
                <label className="field field-wide">
                  <span>File</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(event) => updateFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  className="button button-secondary"
                  type="submit"
                  disabled={!file || uploadMutation.isPending}
                >
                  <Mic aria-hidden="true" size={16} />
                  Transcribe
                </button>
              </form>
              {uploadJobId ? (
                <InlineJobStatus
                  jobId={uploadJobId}
                  fallbackStatus={uploadMutation.data?.status ?? "queued"}
                />
              ) : null}
              {uploadMutation.isError ? (
                <ErrorState error={uploadMutation.error} title="Transcription failed" />
              ) : null}
            </>
          ) : (
            <>
              <h2>Available {activeType} models</h2>
              <div className="tag-list">
                {generationModels.length === 0 ? (
                  <span className="tag">No media models available</span>
                ) : null}
                {generationModels.map((model) => (
                  <span className="tag" key={model.id}>
                    {model.name}
                  </span>
                ))}
              </div>
            </>
          )}
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

interface InlineJobStatusProps {
  jobId: string;
  fallbackStatus: string;
}

function InlineJobStatus({ jobId, fallbackStatus }: InlineJobStatusProps) {
  const query = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJob(jobId),
    refetchInterval: (q) => {
      const detail = q.state.data;
      if (!detail) return 2000;
      return isActiveJobStatus(detail.job.status) ? 2000 : false;
    },
    retry: false,
  });
  const status = query.data?.job.status ?? fallbackStatus;
  const progress = query.data?.job.progress;
  return (
    <p className="section-summary">
      Job <Link to={`/jobs/${jobId}`}>{jobId}</Link> — {status}
      {typeof progress === "number" ? ` (${progress}%)` : ""}
    </p>
  );
}
