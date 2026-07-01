import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, getWorkspaceForUser } from "@/lib/supabase";
import { extractTextFromPdf } from "@/lib/pdf";
import { chunkText } from "@/lib/chunking";
import { embedTexts, vectorToSql } from "@/lib/gemini";

// Allow up to 20 MB uploads
export const maxDuration = 60;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  const workspaceId = formData.get("workspaceId") as string | null;

  if (!file || !workspaceId) {
    return NextResponse.json(
      { error: "file and workspaceId are required" },
      { status: 400 }
    );
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Only PDF files are supported" },
      { status: 400 }
    );
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File size must be 20 MB or less" },
      { status: 400 }
    );
  }

  // Verify workspace ownership — workspaceId comes from the form but is verified server-side
  try {
    await getWorkspaceForUser(workspaceId, userId);
  } catch {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 }
    );
  }

  // ---- Idempotency: remove existing document with the same name in this workspace ----
  const { data: existingDoc } = await supabase
    .from("documents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", file.name)
    .single();

  if (existingDoc) {
    // Chunks cascade-delete via FK
    await supabase.from("documents").delete().eq("id", existingDoc.id);
  }

  // ---- Extract text ----
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let text: string;
  try {
    text = await extractTextFromPdf(buffer);
  } catch (err) {
    return NextResponse.json(
      { error: `PDF extraction failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "PDF appears to be empty or image-only (no extractable text)" },
      { status: 422 }
    );
  }

  // ---- Chunk ----
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    return NextResponse.json(
      { error: "No text chunks produced" },
      { status: 422 }
    );
  }

  // ---- Create document record ----
  const { data: document, error: docError } = await supabase
    .from("documents")
    .insert({
      workspace_id: workspaceId,
      name: file.name,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (docError || !document) {
    return NextResponse.json(
      { error: docError?.message ?? "Failed to create document record" },
      { status: 500 }
    );
  }

  // ---- Embed all chunks ----
  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunks);
  } catch (err) {
    // Roll back document record on embedding failure
    await supabase.from("documents").delete().eq("id", document.id);
    return NextResponse.json(
      { error: `Embedding failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  // ---- Batch insert chunks ----
  const chunkRows = chunks.map((content, i) => ({
    workspace_id: workspaceId,
    document_id: document.id,
    content,
    embedding: vectorToSql(embeddings[i]),
    chunk_index: i,
  }));

  const { error: chunkError } = await supabase
    .from("document_chunks")
    .insert(chunkRows);

  if (chunkError) {
    await supabase.from("documents").delete().eq("id", document.id);
    return NextResponse.json(
      { error: `Failed to store chunks: ${chunkError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      id: document.id,
      name: document.name,
      size_bytes: document.size_bytes,
      chunk_count: chunks.length,
      uploaded_at: document.uploaded_at,
    },
    { status: 201 }
  );
}
