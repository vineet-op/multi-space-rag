"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Workspace } from "@/lib/supabase";
import {
  ChevronDown,
  Plus,
  Trash2,
  Check,
  Loader2,
  FolderOpen,
} from "lucide-react";

const subtleTransition = { duration: 0.16, ease: "easeOut" as const };

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onSwitch: (id: string) => void;
  onCreate: (workspace: Workspace) => void;
  onDelete: (id: string) => void;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onSwitch,
  onCreate,
  onDelete,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setNewName("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreate(data);
        setCreating(false);
        setNewName("");
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (deletingId) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        onDelete(id);
        setOpen(false);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="relative w-full" ref={ref}>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={reduceMotion ? undefined : { scale: 1.01 }}
        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
        transition={subtleTransition}
        className="flex w-full max-w-[240px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5.5 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:border-white/20 hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 lg:max-w-full"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200">
          <FolderOpen className="size-4" />
        </span>
        <span className="truncate">{activeWorkspace.name}</span>
        <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      </motion.button>

      <AnimatePresence>
      {open && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute right-0 top-full z-50 mt-2 w-72 origin-top overflow-hidden rounded-3xl border border-white/10 bg-[#171520]/95 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:left-0 lg:right-auto"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Workspaces
            </p>
          </div>
          <div className="p-2">
            {workspaces.map((ws) => (
              <motion.div
                key={ws.id}
                onClick={() => {
                  if (ws.id !== activeWorkspace.id) onSwitch(ws.id);
                  setOpen(false);
                }}
                whileHover={reduceMotion ? undefined : { x: 1 }}
                transition={subtleTransition}
                className="group flex cursor-pointer items-center justify-between rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/7"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {ws.id === activeWorkspace.id ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
                      <Check className="size-3.5" />
                    </span>
                  ) : (
                    <span className="size-6 shrink-0 rounded-full border border-white/10 bg-white/4" />
                  )}
                  <span className="truncate text-sm font-medium text-white">
                    {ws.name}
                  </span>
                </div>
                {workspaces.length > 1 && (
                  <button
                    onClick={(e) => handleDelete(e, ws.id)}
                    className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                    title="Delete workspace"
                  >
                    {deletingId === ws.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          <div className="border-t border-white/10 p-2">
            <AnimatePresence mode="wait" initial={false}>
            {creating ? (
              <motion.form
                key="create-form"
                initial={reduceMotion ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
                transition={subtleTransition}
                onSubmit={handleCreate}
                className="space-y-2 px-2 py-1.5"
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Workspace name…"
                  maxLength={100}
                  autoFocus
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
                <div className="flex gap-1.5">
                  <motion.button
                    type="submit"
                    disabled={!newName.trim() || loading}
                    whileTap={reduceMotion || !newName.trim() || loading ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-violet-100 disabled:opacity-50"
                  >
                    {loading ? "Creating…" : "Create"}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setNewName("");
                    }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="flex-1 rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/12"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.form>
            ) : (
              <motion.button
                key="new-workspace"
                onClick={() => setCreating(true)}
                initial={reduceMotion ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                transition={subtleTransition}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <Plus className="size-3.5" />
                New workspace
              </motion.button>
            )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
