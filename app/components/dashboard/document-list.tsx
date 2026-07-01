"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Document } from "@/lib/supabase";
import {
  FileText,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FileSearch,
  ShieldCheck,
} from "lucide-react";

const subtleTransition = { duration: 0.18, ease: "easeOut" as const };

interface DocumentListProps {
  workspaceId: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DocumentList({ workspaceId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/documents?workspaceId=${encodeURIComponent(workspaceId)}`
      );
      const data = await res.json();
      if (res.ok) {
        setDocuments(data);
      } else {
        setError(data.error ?? "Failed to load documents");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);


  async function handleUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadStatus({ type: "error", message: "Only PDF files are supported" });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploadStatus({
          type: "success",
          message: `"${data.name}" uploaded — ${data.chunk_count} chunks indexed`,
        });
        await loadDocuments();
      } else {
        setUploadStatus({ type: "error", message: data.error ?? "Upload failed" });
      }
    } catch {
      setUploadStatus({ type: "error", message: "Network error during upload" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: Document) {
    if (deletingId) return;
    setDeletingId(doc.id);
    try {
      const res = await fetch(
        `/api/documents?documentId=${doc.id}&workspaceId=${workspaceId}`,
        { method: "DELETE" }
      );
      if (res.ok || res.status === 204) {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 lg:py-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-violet-200/80">
            Knowledge base
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Documents
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Upload PDFs and ContextVault will extract, chunk, embed, and isolate
            them inside this workspace.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/4.5 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-300" />
          {documents.length} indexed document{documents.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Upload zone */}
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        animate={
          reduceMotion
            ? undefined
            : {
                scale: dragOver ? 1.005 : 1,
                y: dragOver ? -1 : 0,
              }
        }
        whileHover={reduceMotion || uploading ? undefined : { y: -1 }}
        transition={subtleTransition}
        className={`group relative mb-6 flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-dashed p-9 text-center transition-all duration-300 sm:p-12 ${
          dragOver
            ? "border-violet-300 bg-violet-500/15 shadow-2xl shadow-violet-500/20"
            : "border-white/14 bg-white/4.5 hover:border-violet-300/50 hover:bg-white/7"
        } ${uploading ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.22),transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />

        {uploading ? (
          <>
            <div className="relative z-10 mb-1 flex size-14 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-500/15">
              <CloudUpload className="size-6 text-violet-200" />
            </div>
            <p className="relative z-10 text-base font-semibold text-white">
              Processing PDF
            </p>
            <p className="relative z-10 text-sm text-muted-foreground">
              Extracting text, chunking, and embedding
            </p>
            <div className="relative z-10 mt-4 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full w-1/2 rounded-full bg-linear-to-r from-violet-400 to-sky-300"
                animate={reduceMotion ? undefined : { x: ["-80%", "220%"] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="relative z-10 mb-1 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-violet-100 shadow-xl shadow-black/20 transition-transform group-hover:-translate-y-1">
              <CloudUpload className="size-6" />
            </div>
            <p className="relative z-10 text-base font-semibold text-white">
              Drop a PDF here or click to browse
            </p>
            <p className="relative z-10 mt-1 text-sm text-muted-foreground">
              PDF files only, max 20 MB. Re-uploads replace existing chunks.
            </p>
          </>
        )}
      </motion.div>

      {/* Upload status */}
      <AnimatePresence>
        {uploadStatus && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
            transition={subtleTransition}
            className={`mb-5 flex items-start gap-2.5 rounded-lg p-3.5 text-sm ${
              uploadStatus.type === "success"
                ? "rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                : "rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive"
            }`}
          >
            {uploadStatus.type === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            )}
            {uploadStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <DocumentSkeleton />
        </div>
      ) : error ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={subtleTransition}
          className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="size-4" />
          {error}
        </motion.div>
      ) : documents.length === 0 ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/3.5 px-6 py-14 text-center text-muted-foreground">
          <FileSearch className="mx-auto mb-4 size-10 text-violet-200/50" />
          <p className="text-base font-semibold text-white">No documents yet</p>
          <p className="mt-2 text-sm opacity-80">
            Upload a PDF to start chatting with your documents
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              whileHover={reduceMotion ? undefined : { y: -1 }}
              transition={subtleTransition}
              className="group flex items-center gap-4 rounded-3xl border border-white/10 bg-white/4.5 px-4 py-4 shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-violet-300/30 hover:bg-white/7"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                <FileText className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {doc.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBytes(doc.size_bytes)} · {formatDate(doc.uploaded_at)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc)}
                disabled={!!deletingId}
                className="rounded-2xl p-2 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 group-hover:opacity-100"
                title="Delete document"
              >
                {deletingId === doc.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      )}
      </div>
    </div>
  );
}

function DocumentSkeleton() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="w-full max-w-lg space-y-3 rounded-3xl border border-white/10 bg-white/4 p-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-white/8" />
          <div className="flex-1 space-y-2">
            {[0, 1].map((line) => (
              <div
                key={line}
                className="relative h-2 overflow-hidden rounded-full bg-white/8"
              >
                {!reduceMotion && (
                  <motion.div
                    className="absolute inset-y-0 w-1/3 rounded-full bg-white/15"
                    initial={{ x: "-100%" }}
                    animate={{ x: "320%" }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: "linear",
                      delay: row * 0.08 + line * 0.04,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
