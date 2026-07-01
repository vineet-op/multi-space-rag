import { extractText } from "unpdf";

/**
 * Extract plain text from a PDF Buffer.
 * Uses unpdf which runs safely in Node.js without browser DOM APIs.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const uint8Array = new Uint8Array(buffer);
  const { text } = await extractText(uint8Array, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : (text as string);
}
