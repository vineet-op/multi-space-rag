"use client";

import { useState, useEffect, useCallback } from "react";
import type { ToolCall } from "@/lib/supabase";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from "lucide-react";

interface ToolCallLogProps {
  workspaceId: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ToolCallRow({ call }: { call: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((s) => !s)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        {call.status === "success" ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground font-mono">
              {call.tool_name}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                call.status === "success"
                  ? "bg-green-500/10 text-green-500"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {call.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(call.created_at)}
          </p>
        </div>

        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Arguments
            </p>
            <pre className="text-xs text-foreground bg-background border border-border rounded-md p-2.5 overflow-x-auto">
              {JSON.stringify(call.arguments, null, 2)}
            </pre>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Result
            </p>
            <pre className="text-xs text-foreground bg-background border border-border rounded-md p-2.5 overflow-x-auto">
              {JSON.stringify(call.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolCallLog({ workspaceId }: ToolCallLogProps) {
  const [calls, setCalls] = useState<ToolCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCalls = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/tool-calls?workspaceId=${encodeURIComponent(workspaceId)}`
      );
      const data = await res.json();
      if (res.ok) {
        setCalls(data);
      } else {
        setError(data.error ?? "Failed to load tool calls");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCalls();
  }, [loadCalls]);

  const successCount = calls.filter((c) => c.status === "success").length;
  const errorCount = calls.filter((c) => c.status === "error").length;

  return (
    <div className="h-full overflow-auto p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tool Calls</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every tool invocation the AI made in this workspace
          </p>
        </div>
        <button
          onClick={loadCalls}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {calls.length > 0 && (
        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm">
            <Wrench className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-foreground">{calls.length}</span>
            <span className="text-muted-foreground">total</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="font-medium text-green-500">{successCount}</span>
            <span className="text-muted-foreground">success</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
              <XCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="font-medium text-destructive">{errorCount}</span>
              <span className="text-muted-foreground">failed</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive py-4">{error}</div>
      ) : calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No tool calls yet</p>
          <p className="text-xs text-muted-foreground mt-1 opacity-70">
            Ask the AI to save a task or send a Discord summary
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <ToolCallRow key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}
