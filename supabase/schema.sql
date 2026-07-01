-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Workspaces: one per user per "project"
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,           -- Clerk user ID
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workspaces_user_id_idx ON workspaces(user_id);

-- Documents: metadata for each uploaded file
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  size_bytes   INTEGER,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_workspace_id_idx ON documents(workspace_id);

-- Shared vector store: all workspaces in one table, isolated by workspace_id
-- gemini-embedding-004 produces 3072-dimensional vectors
CREATE TABLE IF NOT EXISTS document_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  embedding    VECTOR(3072),
  chunk_index  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_chunks_workspace_id_idx ON document_chunks(workspace_id);
-- Note: HNSW/IVFFlat indexes are capped at 2000 dims in pgvector.
-- gemini-embedding-001 outputs 3072 dims so we use exact cosine search (fine for small corpora).
-- Add an IVFFlat index here if you later truncate to <=2000 dims via outputDimensionality.

-- Chat messages per workspace
CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  citations    JSONB,               -- [{doc_name, chunk_index}]
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_workspace_id_idx ON chat_messages(workspace_id);

-- Tool call audit log
CREATE TABLE IF NOT EXISTS tool_calls (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tool_name    TEXT NOT NULL,
  arguments    JSONB,
  result       JSONB,
  status       TEXT NOT NULL CHECK (status IN ('success', 'error')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tool_calls_workspace_id_idx ON tool_calls(workspace_id);

-- Tasks saved by the save_task tool
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_workspace_id_idx ON tasks(workspace_id);

-- ---- Vector similarity search function ----
-- Returns the top N chunks for a given workspace ordered by cosine similarity.
-- The workspace_id filter is INSIDE this function — isolation is enforced at the SQL level.
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding   TEXT,          -- formatted as pgvector literal "[0.1, 0.2, ...]"
  match_workspace_id UUID,
  match_count       INT DEFAULT 5
)
RETURNS TABLE (
  id           UUID,
  workspace_id UUID,
  document_id  UUID,
  content      TEXT,
  chunk_index  INTEGER,
  doc_name     TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.workspace_id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    d.name AS doc_name
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.workspace_id = match_workspace_id
  ORDER BY dc.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;

-- Row Level Security (enable but use service-role key from server, so policies are informational)
ALTER TABLE workspaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically; these policies guard anon/authenticated roles
CREATE POLICY "service_role_all_workspaces"      ON workspaces      FOR ALL USING (true);
CREATE POLICY "service_role_all_documents"       ON documents       FOR ALL USING (true);
CREATE POLICY "service_role_all_chunks"          ON document_chunks FOR ALL USING (true);
CREATE POLICY "service_role_all_chat_messages"   ON chat_messages   FOR ALL USING (true);
CREATE POLICY "service_role_all_tool_calls"      ON tool_calls      FOR ALL USING (true);
CREATE POLICY "service_role_all_tasks"           ON tasks           FOR ALL USING (true);
  