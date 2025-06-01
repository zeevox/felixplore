// src/routes/trends/+page.server.ts
import db from "$lib/server/db";
import { getQueryEmbedding, SIMILARITY_THRESHOLD } from "$lib/server/embed";
import { isRedirect, redirect, error as SvelteKitError } from "@sveltejs/kit";
import pgvector from "pgvector/pg";
import type { Actions, PageServerLoad } from "./$types";

type TrendRow = { year: string; normalized_prevalence: string };

interface TrendsPageData {
  query: string | null;
  trendData: Promise<{ year: number; popularity: number }[]> | null;
  error: string | null;
}

export const load: PageServerLoad<TrendsPageData> = ({ url }) => {
  const queryParam = url.searchParams.get("query");

  if (!queryParam) {
    return {
      query: null,
      trendData: null,
      error: null,
    };
  }

  const trendData = (async (): Promise<{ year: number; popularity: number }[]> => {
    try {
      const queryEmbedding = await getQueryEmbedding(queryParam);
      if (!queryEmbedding) {
        throw new Error(
          "Failed to generate embedding for the query. Check server logs for details. Ensure Google GenAI SDK is configured.",
        );
      }

      const sqlQuery = `
                WITH all_years AS (
                    SELECT EXTRACT(YEAR FROM article_date)::integer AS year, COUNT(*)
                    FROM articles
                    GROUP BY year
                    HAVING COUNT(*) > 300
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

      const vectorSql = pgvector.toSql(queryEmbedding);
      const result = await db.query<TrendRow>(sqlQuery, [vectorSql, SIMILARITY_THRESHOLD]);

      return result.rows.map((row) => ({
        year: parseInt(row.year, 10),
        popularity: parseFloat(row.normalized_prevalence),
      }));
    } catch (err: unknown) {
      if (isRedirect(err) || (err && typeof err === "object" && "status" in err && "body" in err)) {
        throw err;
      }
      console.error("Error fetching trend data:", err);
      throw SvelteKitError(
        500,
        err instanceof Error
          ? `Failed to fetch trend data: ${err.message}`
          : "Failed to fetch trend data",
      );
    }
  })();

  return {
    query: queryParam,
    trendData,
    error: null,
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const query = ((data.get("query") as string) || "").trim();

    const params = new URLSearchParams();

    if (query) {
      params.set("query", query);
    }

    const redirectPath = `/trends${params.size > 0 ? `?${params.toString()}` : ""}`;
    redirect(303, redirectPath);
  },
};
