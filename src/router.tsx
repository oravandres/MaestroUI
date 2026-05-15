import { type ComponentType, lazy } from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/pages/DashboardPage";

function lazyNamed<TKey extends string>(
  loader: () => Promise<Record<string, unknown>>,
  key: TKey
) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[key] as ComponentType<unknown> };
  });
}

const ChatPage = lazyNamed(() => import("@/pages/ChatPage"), "ChatPage");
const ConversationPage = lazyNamed(
  () => import("@/pages/ConversationPage"),
  "ConversationPage"
);
const RagStudioPage = lazyNamed(() => import("@/pages/RagStudioPage"), "RagStudioPage");
const RagRunPage = lazyNamed(() => import("@/pages/RagRunPage"), "RagRunPage");
const KnowledgePage = lazyNamed(() => import("@/pages/KnowledgePage"), "KnowledgePage");
const KnowledgeSourcePage = lazyNamed(
  () => import("@/pages/KnowledgeSourcePage"),
  "KnowledgeSourcePage"
);
const KnowledgeDocumentPage = lazyNamed(
  () => import("@/pages/KnowledgeDocumentPage"),
  "KnowledgeDocumentPage"
);
const JobsPage = lazyNamed(() => import("@/pages/JobsPage"), "JobsPage");
const JobDetailPage = lazyNamed(() => import("@/pages/JobDetailPage"), "JobDetailPage");
const CodingPage = lazyNamed(() => import("@/pages/CodingPage"), "CodingPage");
const MediaPage = lazyNamed(() => import("@/pages/MediaPage"), "MediaPage");
const ReasoningPage = lazyNamed(() => import("@/pages/ReasoningPage"), "ReasoningPage");
const SystemsPage = lazyNamed(() => import("@/pages/SystemsPage"), "SystemsPage");
const SystemDetailPage = lazyNamed(
  () => import("@/pages/SystemDetailPage"),
  "SystemDetailPage"
);
const ModelsPage = lazyNamed(() => import("@/pages/ModelsPage"), "ModelsPage");
const ModelDetailPage = lazyNamed(
  () => import("@/pages/ModelDetailPage"),
  "ModelDetailPage"
);
const SettingsPage = lazyNamed(() => import("@/pages/SettingsPage"), "SettingsPage");
const MonitoringPage = lazyNamed(() => import("@/pages/MonitoringPage"), "MonitoringPage");

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "chat/:id", element: <ConversationPage /> },
      { path: "rag", element: <RagStudioPage /> },
      { path: "rag/:id", element: <RagRunPage /> },
      { path: "knowledge", element: <KnowledgePage /> },
      { path: "knowledge/sources/:id", element: <KnowledgeSourcePage /> },
      { path: "knowledge/documents/:id", element: <KnowledgeDocumentPage /> },
      { path: "jobs", element: <JobsPage /> },
      { path: "jobs/:id", element: <JobDetailPage /> },
      { path: "coding", element: <CodingPage /> },
      { path: "media", element: <MediaPage /> },
      { path: "reasoning", element: <ReasoningPage /> },
      { path: "systems", element: <SystemsPage /> },
      { path: "systems/:id", element: <SystemDetailPage /> },
      { path: "models", element: <ModelsPage /> },
      { path: "models/:id", element: <ModelDetailPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "monitoring", element: <MonitoringPage /> },
    ],
  },
]);
