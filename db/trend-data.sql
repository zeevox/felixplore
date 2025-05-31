WITH all_years AS (
    SELECT generate_series(
        EXTRACT(YEAR FROM MIN(article_date))::int,
        EXTRACT(YEAR FROM MAX(article_date))::int
    ) AS year
    FROM articles
),
ranked_articles AS (
    SELECT
        EXTRACT(YEAR FROM article_date) AS year,
        ts_rank(
            search_vector,
            to_tsquery('english', 'student & protest'),
            16
        ) AS article_rank
    FROM articles
    WHERE search_vector @@ to_tsquery('english', 'student & protest')
)
SELECT
    ay.year,
    COALESCE(AVG(ra.article_rank), 0.0) AS popularity
FROM all_years ay
LEFT JOIN ranked_articles ra ON ay.year = ra.year
GROUP BY ay.year
ORDER BY ay.year;
