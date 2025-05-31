CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS articles_txt_trgm_idx ON articles USING GIST (txt gist_trgm_ops);

CREATE TEMPORARY TABLE articles_to_delete_ids AS
SELECT
    a1.id
FROM
    articles a1
WHERE
    EXISTS (
        SELECT
            1
        FROM
            articles a2
        WHERE
            a1.id != a2.id -- Not the same article
            AND similarity (a1.txt, a2.txt) > 0.95 -- Highly similar text (adjust 0.95 as needed)
            AND (
                a2.article_date < a1.article_date -- a2 is older
                OR (
                    a2.article_date = a1.article_date
                    AND a2.id < a1.id
                ) -- a2 is same age, but has a 'smaller' id for tie-breaking
            )
    );
