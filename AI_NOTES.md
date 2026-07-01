# AI Notes

## Tools Used

I used Cursor's AI coding agent throughout the project as a pair-programming assistant. I used it mainly for scaffolding the Next.js routes/components, iterating on TypeScript errors, checking library usage, and doing UI polish passes. I made the product and architecture decisions myself, then used the AI to move faster on implementation details and to review for edge cases.

The application itself uses Google Gemini for the product AI features:

- `gemini-2.5-flash` for chat and tool calling
- `gemini-embedding-001` for document/query embeddings

## Key Decisions I Made

1. **Use one shared vector table with workspace filtering inside retrieval.**  
   The core requirement was tenant isolation in a shared store, so every chunk is tagged with `workspace_id`, and the `match_chunks` SQL function filters by workspace before ranking vectors. This avoids the unsafe pattern of retrieving globally and filtering afterward.

2. **Keep ingestion idempotent by replacing chunks for the same document in the same workspace.**  
   Re-uploading the same PDF should not create duplicate embeddings or repeated citations. The upload flow checks for the existing document record and deletes old chunks before inserting the new chunk set.

3. **Use a bounded tool-calling loop with schema validation.**  
   The model can request tools, but only the server executes them. I validate tool arguments with Zod, return errors for malformed/unknown calls, log every attempt, and cap the loop at three rounds so tool use cannot spin indefinitely.

## Hardest Bug / Wrong Turn

The biggest wrong turn was around PDF parsing and embeddings. The initial AI-generated plan used `pdf-parse` and Google's older `text-embedding-004` model. Both looked reasonable at first, but they failed in practice.

The PDF upload started returning `500` errors with `DOMMatrix is not defined`. That showed the parser's dependency was trying to use browser APIs in the server environment. I replaced `pdf-parse` with `unpdf`, which is better suited for server-side extraction in this app.

Then embeddings failed because `text-embedding-004` was not available through the Gemini API path I was using. I checked the current Gemini embedding docs and switched to `gemini-embedding-001`. That created a second issue: the embedding dimension changed to 3072, so the Supabase `vector(768)` column was wrong. I updated the schema to `vector(3072)`. I also removed the HNSW index because pgvector's HNSW index has a 2000-dimension limit, and exact search was acceptable for the small free-tier dataset.

This was the most useful reminder that AI suggestions need to be validated against current docs and real runtime behavior, especially around fast-moving SDKs and model names.

## What I Would Improve With More Time

- Add hybrid retrieval, combining vector similarity with keyword search, then keep the workspace filter inside both retrieval paths.
- Add observability for per-request latency, retrieval hit/miss, token usage, and tool-call timing.
- Add automated tests for workspace isolation, idempotent upload, malformed tool calls, and prompt-injection documents.
- Add optional document sharing between workspaces with explicit permissions, without weakening default isolation.
- Improve PDF ingestion for large documents with background jobs, progress updates, and retryable processing.
