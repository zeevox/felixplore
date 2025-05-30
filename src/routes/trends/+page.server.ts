import db from "$lib/server/db";
import type { PageServerLoad, Actions } from "./$types";
import { getQueryEmbedding } from "$lib/server/embed";
import { redirect } from "@sveltejs/kit";

// Default similarity threshold (tau). Determined empirically.
const DEFAULT_TAU = 0.64;

export const load: PageServerLoad = async ({ url }) => {
    const queryParam = url.searchParams.get("query"); // Changed from 'q'
    const tauParam = url.searchParams.get("tau");

    let tau = DEFAULT_TAU;
    if (tauParam) {
        const parsedTau = parseFloat(tauParam);
        if (!isNaN(parsedTau) && parsedTau >= -1 && parsedTau <= 1) {
            tau = parsedTau;
        } else {
            console.warn(`Invalid tau parameter: ${tauParam}. Using default ${DEFAULT_TAU}.`);
        }
    }

    if (!queryParam) {
        return {
            query: null,
            trendData: null,
            error: null, // No error, just means no query to process
            currentTau: tau
        };
    }

    try {
        const queryEmbedding = await getQueryEmbedding(queryParam);

        if (!queryEmbedding) {
            return {
                query: queryParam,
                trendData: null,
                error: "Failed to generate embedding for the query. Check server logs for details. Ensure Google GenAI SDK is configured.",
                currentTau: tau
            };
        }

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
                WHERE (1 - (gemini_embedding_001 <=> $1::vector)) > $2::double precision
                GROUP BY EXTRACT(YEAR FROM article_date)::integer
            )
            SELECT
                ay.year,
                COALESCE(rpy.relevant_articles::double precision / acpy.total_articles::double precision, 0.0) AS normalized_prevalence
            FROM all_years ay
            LEFT JOIN article_counts_per_year acpy ON ay.year = acpy.year
            LEFT JOIN relevant_articles_per_year rpy ON ay.year = rpy.year
            WHERE acpy.total_articles > 0
            ORDER BY ay.year ASC;
        `;

        const result = await db.query(sqlQuery, [JSON.stringify(queryEmbedding), tau]);

        const trendData = result.rows.map((row) => ({
            year: parseInt(row.year, 10),
            popularity: parseFloat(row.normalized_prevalence)
        }));

        return {
            query: queryParam,
            trendData,
            error: null,
            currentTau: tau
        };
    } catch (e: any) {
        console.error("Error fetching trend data:", e);
        let errorMessage = `Failed to fetch trend data: ${e.message || "Unknown error"}`;
        if (e.cause && e.cause.message) {
            errorMessage += ` Details: ${e.cause.message}`;
        }
        return {
            query: queryParam,
            trendData: null,
            error: errorMessage,
            currentTau: tau
        };
    }
};

export const actions: Actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const query = ((data.get("query") as string) || "").trim();
        const tau = data.get("tau") as string | null; // tau from hidden input

        const params = new URLSearchParams();

        if (query) {
            params.set("query", query);
        }

        if (tau) {
            // If tau was in the form, preserve it
            params.set("tau", tau);
        }

        const redirectPath = `/trends${params.size > 0 ? `?${params.toString()}` : ""}`;
        redirect(303, redirectPath);
    }
};
