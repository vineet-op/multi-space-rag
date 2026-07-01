"use client";

import { useState, useRef, useEffect } from "react";
import type { Workspace } from "@/lib/supabase";
import {
  ChevronDown,
  Plus,
  Trash2,
  Check,
  Loader2,
  FolderOpen,
} from "lucide-react";

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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium text-foreground transition-colors max-w-[200px]"
      >
        <FolderOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="truncate">{activeWorkspace.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-background shadow-xl z-50 overflow-hidden">
          <div className="p-1">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => {
                  if (ws.id !== activeWorkspace.id) onSwitch(ws.id);
                  setOpen(false);
                }}
                className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {ws.id === activeWorkspace.id ? (
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="text-sm text-foreground truncate">
                    {ws.name}
                  </span>
                </div>
                {workspaces.length > 1 && (
                  <button
                    onClick={(e) => handleDelete(e, ws.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    title="Delete workspace"
                  >
                    {deletingId === ws.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-border p-1">
            {creating ? (
              <form onSubmit={handleCreate} className="px-2 py-1.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Workspace name…"
                  maxLength={100}
                  autoFocus
                  className="w-full px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-1.5"
                />
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    disabled={!newName.trim() || loading}
                    className="flex-1 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Creating…" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setNewName("");
                    }}
                    className="flex-1 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
