import { createBrowserRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { ChatPage } from "@/pages/ChatPage";
import { CodingPage } from "@/pages/CodingPage";
import { ConversationPage } from "@/pages/ConversationPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { JobsPage } from "@/pages/JobsPage";
import { KnowledgePage } from "@/pages/KnowledgePage";
import { MediaPage } from "@/pages/MediaPage";
import { ModelDetailPage } from "@/pages/ModelDetailPage";
import { ModelsPage } from "@/pages/ModelsPage";
import { MonitoringPage } from "@/pages/MonitoringPage";
import { RagRunPage } from "@/pages/RagRunPage";
import { RagStudioPage } from "@/pages/RagStudioPage";
import { ReasoningPage } from "@/pages/ReasoningPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SystemDetailPage } from "@/pages/SystemDetailPage";
import { SystemsPage } from "@/pages/SystemsPage";

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
