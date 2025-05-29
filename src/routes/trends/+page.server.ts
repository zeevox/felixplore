// src/routes/trends/+page.server.ts
import db from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { getQueryEmbedding } from '$lib/server/embed';

// Default similarity threshold (tau). Determined empirically.
const DEFAULT_TAU = 0.64;

export const load: PageServerLoad = async ({ url }) => {
    const query = url.searchParams.get('q');
    const tauParam = url.searchParams.get('tau');

    let tau = DEFAULT_TAU;
    if (tauParam) {
        const parsedTau = parseFloat(tauParam);
        if (!isNaN(parsedTau) && parsedTau >= -1 && parsedTau <= 1) {
            tau = parsedTau;
        } else {
            console.warn(`Invalid tau parameter: ${tauParam}. Using default ${DEFAULT_TAU}.`);
        }
    }

    if (!query) {
        return {
            query: null,
            trendData: null,
            error: 'No search query provided.',
            currentTau: tau
        };
    }

    try {
        // 1. Embed the search query using the new function
        const queryEmbedding = await getQueryEmbedding(query);

        if (!queryEmbedding) {
            return {
                query,
                trendData: null,
                error: 'Failed to generate embedding for the query. Check server logs for details. Ensure Google GenAI SDK is configured.',
                currentTau: tau
            };
        }

        // Ensure the query embedding is L2 normalized if your stored embeddings are,
        // or adjust similarity calculation. Assuming pgvector's <=> operator expects L2 normalized vectors
        // for cosine distance. Gemini embeddings are typically L2 normalized.

        const sqlQuery = `
            WITH all_years AS (
                SELECT DISTINCT EXTRACT(YEAR FROM article_date)::integer AS year
                FROM articles
            ),
            article_counts_per_year AS (
                SELECT
                    EXTRACT(YEAR FROM article_date)::integer AS year,
                    COUNT(*) AS total_articles
                FROM articles
                GROUP BY EXTRACT(YEAR FROM article_date)::integer
            ),
            relevant_articles_per_year AS (
                SELECT
                    EXTRACT(YEAR FROM article_date)::integer AS year,
                    COUNT(*) AS relevant_articles
                FROM articles
                -- Calculate cosine similarity: 1 - (cosine_distance)
                -- $1::vector is the query embedding, $2::double precision is the threshold (tau)
                WHERE (1 - (gemini_embedding_001 <=> $1::vector)) > $2::double precision
                GROUP BY EXTRACT(YEAR FROM article_date)::integer
            )
            SELECT
                ay.year,
                COALESCE(rpy.relevant_articles::double precision / acpy.total_articles::double precision, 0.0) AS normalized_prevalence
            FROM all_years ay
            LEFT JOIN article_counts_per_year acpy ON ay.year = acpy.year
            LEFT JOIN relevant_articles_per_year rpy ON ay.year = rpy.year
            WHERE acpy.total_articles > 0 -- Avoid division by zero for years with no articles
            ORDER BY ay.year ASC;
        `;

        const result = await db.query(sqlQuery, [JSON.stringify(queryEmbedding), tau]);

        const trendData = result.rows.map(row => ({
            year: parseInt(row.year, 10),
            popularity: parseFloat(row.normalized_prevalence)
        }));

        return {
            query,
            trendData,
            currentTau: tau
        };
    } catch (e: any) {
        console.error('Error fetching trend data:', e);
        let errorMessage = `Failed to fetch trend data: ${e.message || 'Unknown error'}`;
        if (e.cause && e.cause.message) {
            errorMessage += ` Details: ${e.cause.message}`;
        }
        return {
            query,
            trendData: null,
            error: errorMessage,
            currentTau: tau
        };
    }
};