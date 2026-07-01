"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/lib/supabase";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { DocumentList } from "./document-list";
import { ChatInterface } from "./chat-interface";
import { ToolCallLog } from "./tool-call-log";
import { UserButton } from "@clerk/nextjs";
import { Database, MessageSquare, Wrench, FileText } from "lucide-react";

type Tab = "chat" | "documents" | "tools";

interface DashboardShellProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
}

export function DashboardShell({
  workspaces: initialWorkspaces,
  activeWorkspace,
}: DashboardShellProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [tab, setTab] = useState<Tab>("chat");
  const router = useRouter();

  function handleWorkspaceSwitch(workspaceId: string) {
    router.push(`/dashboard/${workspaceId}`);
  }

  function handleWorkspaceCreate(workspace: Workspace) {
    setWorkspaces((prev) => [...prev, workspace]);
    router.push(`/dashboard/${workspace.id}`);
  }

  function handleWorkspaceDelete(workspaceId: string) {
    const remaining = workspaces.filter((w) => w.id !== workspaceId);
    setWorkspaces(remaining);
    if (remaining.length > 0) {
      router.push(`/dashboard/${remaining[0].id}`);
    } else {
      router.push("/dashboard/new");
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chat", label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
    {
      id: "documents",
      label: "Documents",
      icon: <FileText className="w-4 h-4" />,
    },
    { id: "tools", label: "Tool Calls", icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="border-b border-border px-4 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground text-sm">
            ContextVault
          </span>
        </div>

        <div className="flex items-center gap-3">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onSwitch={handleWorkspaceSwitch}
            onCreate={handleWorkspaceCreate}
            onDelete={handleWorkspaceDelete}
          />
          <UserButton />
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-border px-4 flex items-center gap-1 h-11 flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === "chat" && (
          <ChatInterface
            workspaceId={activeWorkspace.id}
            workspaceName={activeWorkspace.name}
          />
        )}
        {tab === "documents" && (
          <DocumentList workspaceId={activeWorkspace.id} />
        )}
        {tab === "tools" && (
          <ToolCallLog workspaceId={activeWorkspace.id} />
        )}
      </main>
    </div>
  );
}
