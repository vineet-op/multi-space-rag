/**
 * Split text into overlapping chunks for embedding.
 *
 * Strategy: character-based sliding window.
 * - chunkSize: max characters per chunk (default 800 — roughly 200 tokens)
 * - overlap:   characters shared between consecutive chunks (default 100)
 *
 * Chunks are trimmed and empty chunks are dropped.
 */
export function chunkText(
  text: string,
  chunkSize = 800,
  overlap = 100
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks;
}
