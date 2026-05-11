import {
  Activity,
  Bot,
  Brain,
  BriefcaseBusiness,
  Code2,
  Database,
  Gauge,
  MessageSquare,
  MonitorCog,
  Settings,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", path: "/", icon: Gauge },
  { label: "Chat", path: "/chat", icon: MessageSquare },
  { label: "RAG Studio", path: "/rag", icon: Workflow },
  { label: "Knowledge", path: "/knowledge", icon: Database },
  { label: "Jobs", path: "/jobs", icon: BriefcaseBusiness },
  { label: "Coding", path: "/coding", icon: Code2 },
  { label: "Media", path: "/media", icon: Sparkles },
  { label: "Reasoning", path: "/reasoning", icon: Brain },
  { label: "Systems", path: "/systems", icon: MonitorCog },
  { label: "Models", path: "/models", icon: Bot },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Monitoring", path: "/monitoring", icon: Activity },
];
