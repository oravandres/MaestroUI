import { createBrowserRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { ChatPage } from "@/pages/ChatPage";
import { ConversationPage } from "@/pages/ConversationPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { JobsPage } from "@/pages/JobsPage";
import { KnowledgePage } from "@/pages/KnowledgePage";
import { ModelDetailPage } from "@/pages/ModelDetailPage";
import { ModelsPage } from "@/pages/ModelsPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { RagRunPage } from "@/pages/RagRunPage";
import { RagStudioPage } from "@/pages/RagStudioPage";
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
      {
        path: "coding",
        element: <PlaceholderPage title="Coding Review" description="Coding tools arrive in PR 3." />,
      },
      {
        path: "media",
        element: <PlaceholderPage title="Media Studio" description="Media tools arrive in PR 3." />,
      },
      {
        path: "reasoning",
        element: <PlaceholderPage title="Reasoning" description="Reasoning tools arrive in PR 3." />,
      },
      { path: "systems", element: <SystemsPage /> },
      { path: "systems/:id", element: <SystemDetailPage /> },
      { path: "models", element: <ModelsPage /> },
      { path: "models/:id", element: <ModelDetailPage /> },
      {
        path: "settings",
        element: <PlaceholderPage title="Settings" description="Settings arrive in PR 3." />,
      },
      {
        path: "monitoring",
        element: <PlaceholderPage title="Monitoring" description="Monitoring arrives in PR 3." />,
      },
    ],
  },
]);
