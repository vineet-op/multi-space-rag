"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Document } from "@/lib/supabase";
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CloudUpload,
} from "lucide-react";

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
    <div className="h-full overflow-auto p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Documents</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload PDFs to index them into this workspace
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors mb-6 ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        } ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
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
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-foreground font-medium">
              Processing PDF…
            </p>
            <p className="text-xs text-muted-foreground">
              Extracting text, chunking, and embedding
            </p>
          </>
        ) : (
          <>
            <CloudUpload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">
              Drop a PDF here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">PDF files only, max 20 MB</p>
          </>
        )}
      </div>

      {/* Upload status */}
      {uploadStatus && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-lg mb-5 text-sm ${
            uploadStatus.type === "success"
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {uploadStatus.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          {uploadStatus.message}
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-destructive text-sm py-4">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Upload className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No documents yet</p>
          <p className="text-xs mt-1 opacity-70">
            Upload a PDF to start chatting with your documents
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-background/50 hover:bg-muted/30 group transition-colors"
            >
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {doc.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatBytes(doc.size_bytes)} · {formatDate(doc.uploaded_at)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc)}
                disabled={!!deletingId}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                title="Delete document"
              >
                {deletingId === doc.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
