"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";

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

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/chat/history?workspaceId=${encodeURIComponent(workspaceId)}`
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
      { method: "DELETE" }
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
          m.id === assistantMsg.id ? { ...m, streaming: false } : m
        )
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
        })
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Chat · {workspaceName}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear history
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bot className="w-10 h-10 text-muted-foreground/40 mb-4" />
            <p className="text-sm font-medium text-foreground">
              Ask anything about your documents
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Upload PDFs in the Documents tab, then come back and ask questions
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={sending}
            className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 min-h-[42px] max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ExtendedMessage }) {
  const isUser = message.role === "user";
  const [showDebug, setShowDebug] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser ? "bg-primary/20" : "bg-muted"
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          }`}
        >
          {message.streaming && !message.content ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking…
            </span>
          ) : (
            message.content
          )}
          {message.streaming && message.content && (
            <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
          )}
        </div>

        {/* Tool events */}
        {message.tool_events && message.tool_events.length > 0 && (
          <div className="flex flex-col gap-1 w-full">
            {message.tool_events.map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border rounded-md px-2.5 py-1.5"
              >
                <Wrench className="w-3 h-3 text-primary flex-shrink-0" />
                <span>Tool called: <strong>{(event as { name?: string }).name ?? "unknown"}</strong></span>
              </div>
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
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <BookOpen className="w-3 h-3" />
                {message.citations.length} source
                {message.citations.length !== 1 ? "s" : ""}
                {showCitations ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              {showCitations && (
                <div className="mt-1.5 space-y-1">
                  {message.citations.map((c, i) => (
                    <div
                      key={i}
                      className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-2.5 py-1.5"
                    >
                      {c.doc_name} · chunk {c.chunk_index}
                    </div>
                  ))}
                </div>
              )}
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
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="opacity-60">⚙</span>
                Retrieval debug
                {showDebug ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              {showDebug && (
                <div className="mt-1.5 space-y-1.5 max-w-full">
                  {message.retrieval_debug.map((c, i) => (
                    <div
                      key={i}
                      className="text-xs bg-muted/30 border border-border rounded-md px-2.5 py-2"
                    >
                      <p className="font-medium text-foreground mb-0.5">
                        {c.doc_name} · chunk {c.chunk_index}
                      </p>
                      <p className="text-muted-foreground line-clamp-2">
                        {c.content_preview}…
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
