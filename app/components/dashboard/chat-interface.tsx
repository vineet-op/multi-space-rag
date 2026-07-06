"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ChatMessage, Citation } from "@/lib/supabase";
import {
  Send,
  Loader2,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  Wrench,
  AlertCircle,
  BookOpen,
  Trash2,
  Sparkles,
  Quote,
  SearchCheck,
} from "lucide-react";

const subtleTransition = { duration: 0.18, ease: "easeOut" as const };

interface RetrievalDebug {
  doc_name: string;
  chunk_index: number;
  content_preview: string;
}

interface ExtendedMessage extends ChatMessage {
  retrieval_debug?: RetrievalDebug[];
  tool_events?: { name: string; result: unknown }[];
  streaming?: boolean;
}

interface ChatInterfaceProps {
  workspaceId: string;
  workspaceName: string;
}

export function ChatInterface({
  workspaceId,
  workspaceName,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reduceMotion = useReducedMotion();

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/chat/history?workspaceId=${encodeURIComponent(workspaceId)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setMessages(data);
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingHistory(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function clearHistory() {
    if (!confirm("Clear all chat history for this workspace?")) return;
    await fetch(
      `/api/chat/history?workspaceId=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" },
    );
    setMessages([]);
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError("");
    setSending(true);

    // Optimistic user message
    const userMsg: ExtendedMessage = {
      id: `temp-${Date.now()}`,
      workspace_id: workspaceId,
      role: "user",
      content: text,
      citations: null,
      created_at: new Date().toISOString(),
    };

    // Placeholder assistant message
    const assistantMsg: ExtendedMessage = {
      id: `temp-assistant-${Date.now()}`,
      workspace_id: workspaceId,
      role: "assistant",
      content: "",
      citations: null,
      created_at: new Date().toISOString(),
      streaming: true,
      tool_events: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const abort = new AbortController();
      abortRef.current = abort;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, workspaceId }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              handleSSEPayload(payload);
            } catch {
              // ignore malformed lines
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
      // Remove the streaming placeholder
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
    } finally {
      setSending(false);
      // Mark streaming done
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id ? { ...m, streaming: false } : m,
        ),
      );
    }

    function handleSSEPayload(payload: Record<string, unknown>) {
      const event = payload;

      // Server-sent error — surface it to the user
      if ("message" in event && !("text" in event)) {
        const errMsg = event.message as string;
        setError(`AI error: ${errMsg}`);
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
        return;
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantMsg.id) return m;

          if ("text" in event) {
            return { ...m, content: m.content + (event.text as string) };
          }
          if ("tool_call" in event || "tool_result" in event) {
            const toolPayload = event.tool_call ?? event.tool_result;
            return {
              ...m,
              tool_events: [
                ...(m.tool_events ?? []),
                toolPayload as { name: string; result: unknown },
              ],
            };
          }
          if ("retrieval_debug" in event) {
            return {
              ...m,
              retrieval_debug: event.retrieval_debug as RetrievalDebug[],
            };
          }
          if ("citations" in event) {
            return { ...m, citations: event.citations as Citation[] };
          }
          return m;
        }),
      );
    }
  }, [input, sending, workspaceId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.10),transparent_32rem)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Bot className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Ask ContextVault</p>
            <p className="text-xs text-muted-foreground">
              Grounded in {workspaceName}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4.5 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
          >
            <Trash2 className="size-3.5" />
            Clear history
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-7 lg:px-10">
        {loadingHistory ? (
          <LoadingSkeleton label="Loading conversation" />
        ) : messages.length === 0 ? (
          <div className="mx-auto flex min-h-[58vh] max-w-3xl flex-col items-center justify-center text-center">
            <div className="relative mb-7">
              <div className="absolute inset-0 rounded-full bg-violet-500/30 blur-2xl" />
              <div className="relative flex size-16 items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/8 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <Sparkles className="size-7 text-violet-200" />
              </div>
            </div>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.24em] text-violet-200/80">
              Workspace intelligence
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Ask precise questions.
              <span className="block text-gradient">Get cited answers.</span>
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              ContextVault retrieves only from this workspace, cites the source
              chunks, and can take approved actions when you ask.
            </p>
            <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
              {[
                "Summarize this workspace",
                "What decisions are mentioned?",
                "Save a follow-up task",
              ].map((example) => (
                <motion.button
                  key={example}
                  onClick={() => {
                    setInput(example);
                    inputRef.current?.focus();
                  }}
                  whileHover={reduceMotion ? undefined : { y: -1, scale: 1.01 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  transition={subtleTransition}
                  className="rounded-2xl border border-white/10 bg-white/4.5 px-4 py-3 text-left text-sm text-zinc-300 transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                >
                  {example}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
              transition={subtleTransition}
              className="mx-auto flex max-w-4xl items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/10 bg-black/10 px-4 py-4 backdrop-blur-xl sm:px-7">
        <div className="mx-auto max-w-4xl">
          <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <span>Enter to send · Shift Enter for a new line</span>
            <span>{input.length}/4000</span>
          </div>
          <div className="flex items-end gap-2 rounded-[1.35rem] border border-white/10 bg-white/6 p-2 shadow-2xl shadow-black/20 transition-colors focus-within:border-violet-400/40 focus-within:bg-white/8">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this workspace..."
              rows={1}
              disabled={sending}
              maxLength={4000}
              className="max-h-36 min-h-[44px] flex-1 resize-none overflow-y-auto rounded-2xl border-0 bg-transparent px-3 py-3 text-sm leading-6 text-white placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <motion.button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              whileHover={
                reduceMotion || !input.trim() || sending
                  ? undefined
                  : { scale: 1.02 }
              }
              whileTap={
                reduceMotion || !input.trim() || sending
                  ? undefined
                  : { scale: 0.98 }
              }
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-lg shadow-black/20 transition-all hover:scale-[1.02] hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ExtendedMessage }) {
  const isUser = message.role === "user";
  const [showDebug, setShowDebug] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      layout={false}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-linear-to-br from-violet-500/25 to-sky-500/10 text-violet-100 shadow-lg shadow-black/15">
          <Bot className="size-4" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`flex max-w-[88%] flex-col gap-3 sm:max-w-[78%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`whitespace-pre-wrap text-sm leading-7 shadow-xl shadow-black/10 ${
            isUser
              ? "rounded-[1.4rem] rounded-tr-md bg-white px-5 py-3.5 text-zinc-950"
              : "rounded-[1.4rem] rounded-tl-md border border-white/10 bg-white/5.5 px-5 py-4 text-zinc-100 backdrop-blur-xl"
          }`}
        >
          {message.streaming && !message.content ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="flex gap-1">
                {[0, 0.12, 0.24].map((delay) => (
                  <motion.span
                    key={delay}
                    animate={
                      reduceMotion ? undefined : { opacity: [0.35, 1, 0.35] }
                    }
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay,
                    }}
                    className="size-1.5 rounded-full bg-violet-300"
                  />
                ))}
              </span>
              Reading workspace context...
            </span>
          ) : (
            message.content
          )}
          {message.streaming && message.content && (
            <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-full bg-violet-300 align-middle" />
          )}
        </div>

        {/* Tool events */}
        {message.tool_events && message.tool_events.length > 0 && (
          <div className="flex flex-col gap-1 w-full">
            {message.tool_events.map((event, i) => (
              <motion.div
                key={i}
                initial={reduceMotion ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={subtleTransition}
                className="flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-100"
              >
                <Wrench className="size-3.5 shrink-0 text-violet-300" />
                <span>
                  Tool called:{" "}
                  <strong>
                    {(event as { name?: string }).name ?? "unknown"}
                  </strong>
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Citations toggle */}
        {!isUser &&
          message.citations &&
          message.citations.length > 0 &&
          !message.streaming && (
            <div className="w-full">
              <button
                onClick={() => setShowCitations((s) => !s)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <BookOpen className="size-3.5" />
                {message.citations.length} source
                {message.citations.length !== 1 ? "s" : ""}
                {showCitations ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>
              <AnimatePresence initial={false}>
                {showCitations && (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
                    transition={subtleTransition}
                    className="mt-2 grid gap-2 sm:grid-cols-2"
                  >
                    {message.citations.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-white/10 bg-white/4.5 px-3 py-2 text-xs text-muted-foreground"
                      >
                        <div className="mb-1 flex items-center gap-1.5 text-zinc-200">
                          <Quote className="size-3 text-violet-300" />
                          Source {i + 1}
                        </div>
                        <p className="truncate">
                          {c.doc_name} · chunk {c.chunk_index}
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        {/* Retrieval debug toggle */}
        {!isUser &&
          message.retrieval_debug &&
          message.retrieval_debug.length > 0 &&
          !message.streaming && (
            <div className="w-full">
              <button
                onClick={() => setShowDebug((s) => !s)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <SearchCheck className="size-3.5" />
                Retrieval debug
                {showDebug ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>
              <AnimatePresence initial={false}>
                {showDebug && (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
                    transition={subtleTransition}
                    className="mt-2 space-y-2 max-w-full"
                  >
                    {message.retrieval_debug.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs"
                      >
                        <p className="mb-1 font-medium text-white">
                          {i + 1}. {c.doc_name} · chunk {c.chunk_index}
                        </p>
                        <p className="text-muted-foreground line-clamp-2">
                          {c.content_preview}…
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
      </div>
      {isUser && (
        <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
          <User className="size-4" />
        </div>
      )}
    </motion.div>
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

function LoadingSkeleton({ label: _ }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Assistant bubble skeleton */}
      <div className="flex gap-4 justify-start">
        <div className="mt-1 size-9 shrink-0 rounded-2xl bg-white/8" />
        <div className="w-2/3 rounded-[1.4rem] rounded-tl-md border border-white/10 bg-white/5.5 px-5 py-4 space-y-2.5">
          <ShimmerBar width="w-full" height="h-2" delay={0} />
          <ShimmerBar width="w-4/5" height="h-2" delay={0.04} />
          <ShimmerBar width="w-3/5" height="h-2" delay={0.08} />
        </div>
      </div>

      {/* User bubble skeleton */}
      <div className="flex gap-4 justify-end">
        <div className="w-2/5 rounded-[1.4rem] rounded-tr-md bg-white/10 px-5 py-3.5 space-y-2">
          <ShimmerBar width="w-full" height="h-2" delay={0.1} />
          <ShimmerBar width="w-3/4" height="h-2" delay={0.14} />
        </div>
        <div className="mt-1 size-9 shrink-0 rounded-2xl bg-white/8" />
      </div>

      {/* Assistant bubble skeleton — longer */}
      <div className="flex gap-4 justify-start">
        <div className="mt-1 size-9 shrink-0 rounded-2xl bg-white/8" />
        <div className="w-3/4 rounded-[1.4rem] rounded-tl-md border border-white/10 bg-white/5.5 px-5 py-4 space-y-2.5">
          <ShimmerBar width="w-full" height="h-2" delay={0.06} />
          <ShimmerBar width="w-5/6" height="h-2" delay={0.1} />
          <ShimmerBar width="w-full" height="h-2" delay={0.14} />
          <ShimmerBar width="w-2/3" height="h-2" delay={0.18} />
        </div>
      </div>
    </div>
  );
}
