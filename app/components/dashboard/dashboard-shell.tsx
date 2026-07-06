"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { Workspace } from "@/lib/supabase";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { DocumentList } from "./document-list";
import { ChatInterface } from "./chat-interface";
import { ToolCallLog } from "./tool-call-log";
import { UserButton } from "@clerk/nextjs";
import {
  Activity,
  Database,
  FileText,
  Layers3,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

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
  const reduceMotion = useReducedMotion();
  const softTransition = { duration: 0.18, ease: "easeOut" as const };

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

  const tabs: { id: Tab; label: string; description: string; icon: React.ReactNode }[] = [
    {
      id: "chat",
      label: "Ask",
      description: "Grounded answers",
      icon: <MessageSquare className="size-4" />,
    },
    {
      id: "documents",
      label: "Documents",
      description: "Workspace knowledge",
      icon: <FileText className="size-4" />,
    },
    {
      id: "tools",
      label: "Tool Calls",
      description: "Actions and audit",
      icon: <Wrench className="size-4" />,
    },
  ];

  return (
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-size-[72px_72px] mask-[radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-linear-to-r from-transparent via-violet-400/50 to-transparent"
      />

      <div className="relative grid h-full grid-cols-1 p-3 lg:grid-cols-[300px_1fr] lg:p-4">
        <motion.aside
          initial={reduceMotion ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="hidden lg:flex lg:flex-col"
        >
          <div className="glass-panel flex h-full flex-col rounded-[2rem] p-4">
            <div className="mb-8 flex items-center gap-3 px-2 pt-1">
              <div className="relative flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 via-indigo-500 to-sky-500 shadow-lg shadow-violet-500/25">
                <Database className="size-5 text-white" />
                <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#181625] bg-emerald-400" />
              </div>
              <div>
                <p className="text-[15px] font-semibold tracking-tight text-white">
                  ContextVault
                </p>
                <p className="text-xs text-muted-foreground">
                  Multi-workspace RAG
                </p>
              </div>
            </div>

            <div className="mb-4 px-2">
              <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                onSwitch={handleWorkspaceSwitch}
                onCreate={handleWorkspaceCreate}
                onDelete={handleWorkspaceDelete}
              />
            </div>

            <nav className="space-y-2" aria-label="Workspace navigation">
              {tabs.map((t) => (
                <motion.button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  whileHover={reduceMotion ? undefined : { scale: 1.01 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  transition={softTransition}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
                    tab === t.id
                      ? "bg-white text-zinc-950 shadow-xl shadow-black/20"
                      : "text-muted-foreground hover:bg-white/7 hover:text-white"
                  }`}
                >
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl transition-colors ${
                      tab === t.id
                        ? "bg-linear-to-br from-violet-600 to-indigo-600 text-white"
                        : "bg-white/6 text-muted-foreground group-hover:text-white"
                    }`}
                  >
                    {t.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{t.label}</span>
                    <span
                      className={`block text-xs ${
                        tab === t.id ? "text-zinc-500" : "text-muted-foreground"
                      }`}
                    >
                      {t.description}
                    </span>
                  </span>
                </motion.button>
              ))}
            </nav>

            <div className="mt-auto space-y-3">
              <div className="rounded-3xl border border-white/10 bg-linear-to-br from-violet-500/16 via-white/4.5 to-sky-500/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-violet-200">
                  <ShieldCheck className="size-4" />
                  Isolation active
                </div>
                <p className="text-sm leading-6 text-zinc-300">
                  Retrieval is scoped to this workspace before the model sees context.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/4.5 px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="size-3.5 text-emerald-400" />
                  System ready
                </div>
                <UserButton />
              </div>
            </div>
          </div>
        </motion.aside>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: 0.03 }}
          className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:pl-4"
        >
          <header className="mb-3 flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-white/4.5 p-3 shadow-2xl shadow-black/10 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between lg:p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-lg shadow-black/20 lg:hidden">
                <Database className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Active workspace
                  </p>
                  <Sparkles className="size-3.5 text-violet-300" />
                </div>
                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {activeWorkspace.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="lg:hidden">
                <WorkspaceSwitcher
                  workspaces={workspaces}
                  activeWorkspace={activeWorkspace}
                  onSwitch={handleWorkspaceSwitch}
                  onCreate={handleWorkspaceCreate}
                  onDelete={handleWorkspaceDelete}
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-muted-foreground">
                <Layers3 className="size-3.5 text-violet-300" />
                {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
              </div>
              <div className="lg:hidden">
                <UserButton />
              </div>
            </div>
          </header>

          <div className="mb-3 grid grid-cols-3 gap-2 lg:hidden">
            {tabs.map((t) => (
              <motion.button
                key={t.id}
                onClick={() => setTab(t.id)}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={softTransition}
                className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
                  tab === t.id
                    ? "bg-white text-zinc-950 shadow-lg shadow-black/20"
                    : "border border-white/10 bg-white/4.5 text-muted-foreground"
                }`}
              >
                {t.icon}
                {t.label}
              </motion.button>
            ))}
          </div>

          <motion.main
            key={tab}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="premium-card min-h-0 flex-1 overflow-hidden rounded-[2rem]"
          >
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
          </motion.main>
        </motion.div>
      </div>
    </div>
  );
}
