// src/lib/server/embed.ts
import { GoogleGenAI } from '@google/genai';
import { GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION } from '$env/static/private';

let genAI: GoogleGenAI | null = null;

if (GOOGLE_CLOUD_PROJECT && GOOGLE_CLOUD_LOCATION) {
    try {
        genAI = new GoogleGenAI({
            vertexai: true,
            project: GOOGLE_CLOUD_PROJECT,
            location: GOOGLE_CLOUD_LOCATION,
        });
    } catch (error) {
        console.error('Failed to initialize GoogleGenAI SDK:', error);
        // genAI will remain null, and getQueryEmbedding will handle this
    }
} else {
    console.warn('GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_LOCATION not set. Embedding functionality will be disabled.');
}

/**
 * Generates an embedding vector for the given text using the Gemini embedding model.
 *
 * @param text The text to embed.
 * @returns A promise that resolves to an array of numbers (the embedding vector)
 * or null if embedding fails or the SDK is not initialized.
 */
export async function getQueryEmbedding(text: string): Promise<number[] | null> {
    if (!genAI) {
        console.error('Google GenAI SDK not initialized. Cannot generate embedding.');
        return null;
    }

    if (!text || text.trim() === '') {
        console.warn('Input text for embedding is empty.');
        return null;
    }

    try {
        const embedResponse = await genAI.models.embedContent({
            model: 'gemini-embedding-001',
            contents: [text],
            config: {
                taskType: 'RETRIEVAL_QUERY',
            }
        });

        const embedding = embedResponse.embeddings?.[0]?.values;

        if (!embedding) {
            console.error('Failed to generate embedding for the text. No embedding found in response.');
            return null;
        }
        return embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        return null;
    }
}