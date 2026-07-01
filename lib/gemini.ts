import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type EmbedContentResponse,
} from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Chat model with tool-calling support
export function getChatModel(): GenerativeModel {
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

// Embedding model — gemini-embedding-001 produces 3072-dim vectors (stable, v1beta compatible)
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

/**
 * Embed a single piece of text. Returns a 768-dimensional float array.
 */
export async function embedText(text: string): Promise<number[]> {
  const result: EmbedContentResponse = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

/**
 * Embed multiple texts in sequence (Gemini free tier has no batch embedding endpoint).
 * Returns an array of embedding vectors in the same order as the input.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await embedText(text));
  }
  return embeddings;
}

/** Format a float[] as a pgvector literal string, e.g. "[0.1,0.2,...]" */
export function vectorToSql(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
