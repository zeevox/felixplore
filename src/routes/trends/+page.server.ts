// src/routes/trends/+page.server.ts
import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const query = url.searchParams.get('q');

    if (!query) {
        return {
            query: null,
            trendData: null,
            error: 'No search query provided.'
        };
    }

    try {
        const sqlQuery = `
            WITH all_years AS (
                SELECT DISTINCT EXTRACT(YEAR FROM article_date) AS year
                FROM articles
            ),
            ranked_articles AS (
                SELECT
                    EXTRACT(YEAR FROM article_date) AS year,
                    ts_rank(
                        search_vector,
                        to_tsquery('english', $1),
                        1|32 -- Normalization option
                    ) * 100 AS article_rank
                FROM articles
                WHERE search_vector @@ to_tsquery('english', $1)
            )
            SELECT
                ay.year,
                COALESCE(AVG(ra.article_rank), 0.0) AS popularity
            FROM all_years ay
            LEFT JOIN ranked_articles ra ON ay.year = ra.year
            GROUP BY ay.year
            ORDER BY ay.year ASC;
        `;

        const formattedQuery = query.trim().split(/\s+/).join(' & ');
        const result = await db.query(sqlQuery, [formattedQuery]);

        const trendData = result.rows.map(row => ({
            year: parseInt(row.year, 10),
            popularity: parseFloat(row.popularity)
        }));

        return {
            query,
            trendData
        };
    } catch (e: any) {
        console.error('Error fetching trend data:', e);
        return {
            query,
            trendData: null,
            error: `Failed to fetch trend data: ${e.message}`
        };
    }
};