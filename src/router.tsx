import { createBrowserRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { ModelDetailPage } from "@/pages/ModelDetailPage";
import { ModelsPage } from "@/pages/ModelsPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { SystemDetailPage } from "@/pages/SystemDetailPage";
import { SystemsPage } from "@/pages/SystemsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: "chat",
        element: <PlaceholderPage title="Chat" description="Conversation workflows arrive in PR 2." />,
      },
      {
        path: "chat/:id",
        element: <PlaceholderPage title="Conversation" description="Conversation detail arrives in PR 2." />,
      },
      {
        path: "rag",
        element: <PlaceholderPage title="RAG Studio" description="RAG run workflows arrive in PR 2." />,
      },
      {
        path: "rag/:id",
        element: <PlaceholderPage title="RAG Run" description="RAG detail arrives in PR 2." />,
      },
      {
        path: "knowledge",
        element: <PlaceholderPage title="Knowledge" description="Knowledge management arrives in PR 2." />,
      },
      {
        path: "jobs",
        element: <PlaceholderPage title="Jobs" description="Jobs and queue workflows arrive in PR 2." />,
      },
      {
        path: "jobs/:id",
        element: <PlaceholderPage title="Job Detail" description="Job detail arrives in PR 2." />,
      },
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
