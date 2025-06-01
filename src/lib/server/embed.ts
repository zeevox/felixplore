// src/lib/server/embed.ts

/* We use dynamic environment variables since we can't
package them statically into the Docker container. */
import { env } from "$env/dynamic/private";
import { GoogleGenAI } from "@google/genai";
import pgvector from "pgvector/pg";
import db from "./db";

// Default similarity threshold (tau). Determined empirically.
export const SIMILARITY_THRESHOLD = 0.65;

const GOOGLE_CLOUD_PROJECT = env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = env.GOOGLE_CLOUD_LOCATION;
let genAI: GoogleGenAI | null = null;

if (GOOGLE_CLOUD_PROJECT && GOOGLE_CLOUD_LOCATION) {
  try {
    genAI = new GoogleGenAI({
      vertexai: true,
      project: GOOGLE_CLOUD_PROJECT,
      location: GOOGLE_CLOUD_LOCATION,
    });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI SDK:", error);
    // genAI will remain null, and getQueryEmbedding will handle this
  }
}

/*
CREATE TABLE embedding_cache_gemini_001 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_text TEXT NOT NULL UNIQUE,
    embedding VECTOR(3072) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usage_count INTEGER NOT NULL DEFAULT 1
);
*/

/**
 * Generates an embedding vector for the given text using the Gemini embedding model.
 * It first checks a local cache (PostgreSQL table) for an existing embedding.
 * If found, it returns the cached embedding and updates usage metadata.
 * If not found, it generates a new embedding, stores it in the cache, and then returns it.
 *
 * @param text The text to embed.
 * @returns A promise that resolves to an array of numbers (the embedding vector)
 * or null if embedding fails, the SDK is not initialized, or the input text is empty.
 */
export async function getQueryEmbedding(text: string): Promise<number[] | null> {
  if (!genAI) {
    console.error("Google GenAI SDK not initialized. Cannot generate embedding.");
    return null;
  }

  if (!text || text.trim() === "") {
    console.warn("Input text for embedding is empty.");
    return null;
  }

  // Use trimmed text for cache consistency
  const trimmedText = text.trim();

  try {
    // Check cache first
    const selectQuery = `
            SELECT id, embedding
            FROM embedding_cache_gemini_001
            WHERE query_text = $1;
        `;
    const cacheResult = await db.query(selectQuery, [trimmedText]);

    if (cacheResult.rows.length > 0) {
      const cachedEntry = cacheResult.rows[0];

      // Asynchronously update last_used_at and usage_count without blocking the response
      const updateQuery = `
                UPDATE embedding_cache_gemini_001
                SET last_used_at = NOW(), usage_count = usage_count + 1
                WHERE id = $1;
            `;
      db.query(updateQuery, [cachedEntry.id]).catch((err) => {
        console.error("Failed to update embedding cache metadata:", err);
        // Continue, as we have the embedding
      });

      return cachedEntry.embedding;
    }

    // Not in cache, generate embedding via API
    const embedResponse = await genAI.models.embedContent({
      model: "gemini-embedding-001", // Ensure this is the correct model identifier
      contents: [{ parts: [{ text: trimmedText }] }], // Corrected contents structure
      config: {
        taskType: "RETRIEVAL_QUERY",
      },
    });

    const embeddingValue = embedResponse.embeddings?.[0]?.values; // Accessing the embedding directly

    if (!embeddingValue) {
      console.error(
        "Failed to generate embedding for the text. No embedding found in API response.",
      );
      return null;
    }

    // Store new embedding in cache
    const insertQuery = `
            INSERT INTO embedding_cache_gemini_001 (query_text, embedding)
            VALUES ($1, $2)
            ON CONFLICT (query_text) DO NOTHING;
            -- DO NOTHING handles rare race conditions where another process inserted it just now.
        `;
    await db.query(insertQuery, [trimmedText, pgvector.toSql(embeddingValue)]);

    return embeddingValue;
  } catch (error) {
    console.error("Error during embedding process (cache interaction or API call):", error);
    return null;
  }
}
