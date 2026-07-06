"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ToolCall } from "@/lib/supabase";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Activity,
  ShieldCheck,
} from "lucide-react";

const subtleTransition = { duration: 0.18, ease: "easeOut" as const };

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
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      transition={subtleTransition}
      className="overflow-hidden rounded-3xl border border-white/10 bg-white/4.5 shadow-lg shadow-black/10"
    >
      <motion.button
        onClick={() => setExpanded((s) => !s)}
        whileTap={reduceMotion ? undefined : { scale: 0.995 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
        className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-white/5.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
            call.status === "success"
              ? "bg-emerald-500/12 text-emerald-300"
              : "bg-destructive/12 text-destructive"
          }`}
        >
          {call.status === "success" ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <XCircle className="size-5" />
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-sm font-semibold text-white">
              {call.tool_name}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                call.status === "success"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {call.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(call.created_at)}
          </p>
        </div>

        {expanded ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </motion.button>

      <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="space-y-3 border-t border-white/10 bg-black/20 px-4 py-4"
        >
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Arguments
            </p>
            <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-xs leading-6 text-zinc-200">
              {JSON.stringify(call.arguments, null, 2)}
            </pre>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Result
            </p>
            <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-xs leading-6 text-zinc-200">
              {JSON.stringify(call.result, null, 2)}
            </pre>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ToolCallLog({ workspaceId }: ToolCallLogProps) {
  const [calls, setCalls] = useState<ToolCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reduceMotion = useReducedMotion();

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
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 lg:py-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-violet-200/80">
            Operations
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Tool Calls
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Every assistant action is validated, executed server-side, and recorded
            with its arguments and result.
          </p>
        </div>
        <motion.button
          onClick={loadCalls}
          disabled={loading}
          whileHover={reduceMotion || loading ? undefined : { scale: 1.01 }}
          whileTap={reduceMotion || loading ? undefined : { scale: 0.99 }}
          transition={subtleTransition}
          className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/4.5 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/8 hover:text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </motion.button>
      </div>

      {/* Stats */}
      {calls.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/4.5 p-4">
            <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
              <Wrench className="size-4" />
            </div>
            <p className="text-2xl font-semibold text-white">{calls.length}</p>
            <p className="text-sm text-muted-foreground">total calls</p>
          </div>
          <div className="rounded-3xl border border-emerald-400/15 bg-emerald-500/10 p-4">
            <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
              <CheckCircle2 className="size-4" />
            </div>
            <p className="text-2xl font-semibold text-emerald-200">{successCount}</p>
            <p className="text-sm text-muted-foreground">successful</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/4.5 p-4">
            <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-white/6 text-sky-200">
              <ShieldCheck className="size-4" />
            </div>
            <p className="text-2xl font-semibold text-white">{errorCount}</p>
            <p className="text-sm text-muted-foreground">failed calls</p>
          </div>
        </div>
      )}

      {loading ? (
        <ToolCallSkeleton />
      ) : error ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={subtleTransition}
          className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </motion.div>
      ) : calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/3.5 px-6 py-16 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/6 text-violet-200">
            <ClipboardList className="size-7" />
          </div>
          <p className="text-base font-semibold text-white">No tool calls yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask the AI to save a task or send a Discord summary
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-muted-foreground">
            <Activity className="size-3.5 text-emerald-300" />
            Waiting for the first action
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
          {calls.map((call) => (
            <ToolCallRow key={call.id} call={call} />
          ))}
          </AnimatePresence>
        </div>
      )}
      </div>
    </div>
  );
}

function ShimmerBar({
  width = "w-full",
  height = "h-2",
  delay = 0,
}: {
  width?: string;
  height?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={`relative overflow-hidden rounded-full bg-white/8 ${height} ${width}`}>
      {!reduceMotion && (
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full bg-white/15"
          initial={{ x: "-100%" }}
          animate={{ x: "320%" }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear", delay }}
        />
      )}
    </div>
  );
}

function ToolCallSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* Stat cards skeleton — matches the 3-column grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((col) => (
          <div
            key={col}
            className="rounded-3xl border border-white/10 bg-white/4.5 p-4 space-y-3"
          >
            <div className="size-10 rounded-2xl bg-white/8" />
            <ShimmerBar width="w-12" height="h-5" delay={col * 0.05} />
            <ShimmerBar width="w-20" height="h-2" delay={col * 0.05 + 0.04} />
          </div>
        ))}
      </div>

      {/* Tool call row skeletons — matches expandable row layout */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/4.5 px-4 py-4"
          >
            {/* Status icon placeholder */}
            <div className="size-11 shrink-0 rounded-2xl bg-white/8" />
            {/* Text content */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <ShimmerBar width="w-32" height="h-2.5" delay={row * 0.05} />
                <ShimmerBar width="w-14" height="h-2" delay={row * 0.05 + 0.03} />
              </div>
              <ShimmerBar width="w-24" height="h-2" delay={row * 0.05 + 0.06} />
            </div>
            {/* Chevron placeholder */}
            <div className="size-4 shrink-0 rounded bg-white/8" />
          </div>
        ))}
      </div>
    </div>
  );
}
