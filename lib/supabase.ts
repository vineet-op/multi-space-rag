import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
  );
}

// Service-role client — server only, bypasses RLS
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// ---- Type definitions mirroring the DB schema ----

export type Workspace = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Document = {
  id: string;
  workspace_id: string;
  name: string;
  size_bytes: number | null;
  uploaded_at: string;
};

export type DocumentChunk = {
  id: string;
  workspace_id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  workspace_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  created_at: string;
};

export type Citation = {
  doc_name: string;
  chunk_index: number;
};

export type ToolCall = {
  id: string;
  workspace_id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: "success" | "error";
  created_at: string;
};

export type Task = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  created_at: string;
};

// ---- Helpers ----

/** Verify the workspace belongs to the given Clerk user and return it. Throws on mismatch. */
export async function getWorkspaceForUser(
  workspaceId: string,
  userId: string
): Promise<Workspace> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Workspace not found or access denied");
  }
  return data as Workspace;
}
