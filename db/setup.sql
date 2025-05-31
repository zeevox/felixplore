
-- Enable the uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add the UUID column with a default value
ALTER TABLE articles
ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();

-- Update pages to be 1-indexed
UPDATE articles SET page_no = page_no - 1 WHERE issue_no >= 1299;
UPDATE articles SET page_no = page_no - 1 WHERE publication = 'felix-daily-2011';

UPDATE articles SET headline = '' WHERE headline = 'Untitled';

-- Clean newspaper sections
UPDATE articles
SET category = NULL
WHERE LOWER(TRIM(category)) IN (
  '', 'unspecified', 'uncategorised', 'not specified', 'miscellaneous', 'general', 'untitled', 'article',
  'various', '(not specified)', 'none', 'n/a', 'other', 'unknown', 'unk', '--', 'felix', '""'
);

-- Remove "by" from author nams
UPDATE articles
SET author = REGEXP_REPLACE(author, '^\s*by\s+', '', 'i')
WHERE author ~* '^\s*by\s+';

-- Clean author names
UPDATE articles
SET author = NULL
WHERE LOWER(TRIM(author)) IN (
  '', 'n/a', 'unknown', 'advertisement', 'none', 'staff', '(not specified)', 'not specified'
);

-- Replace long runs of dashes (-------) with three
UPDATE articles
SET txt = REGEXP_REPLACE(txt, '[-]{4,}', '---', 'g')
WHERE txt ~ '[-]{4,}';

-- Replace longs runs of underscores with three
UPDATE articles
SET txt = REGEXP_REPLACE(txt, '_{4,}', '___', 'g')
WHERE txt ~ '_{4,}';

-- Replace long runs of dots with three
UPDATE articles
SET txt = REGEXP_REPLACE(txt, '([.•]|[.•] ){4,}', '...', 'g')
WHERE txt ~ '([.•]|[.•] ){4,}';

-- Replace long runs of stars (more than five) with five stars
UPDATE articles
SET txt = REGEXP_REPLACE(txt, '★{6,}', '★★★★★', 'g')
WHERE txt ~ '★{6,}';

-- Clean long runs of equal signs
UPDATE articles
SET txt = REGEXP_REPLACE(txt, '={4,}', '===', 'g')
WHERE txt ~ '={4,}';

--- Replace long runs of hashes
UPDATE articles
SET txt = REGEXP_REPLACE(txt, '#{4,}', '###', 'g')
WHERE txt ~ '#{4,}';

-- Replace runs of more than 10 of the same punctuation character with exactly 10
UPDATE articles
SET txt = REGEXP_REPLACE(txt, '([[:punct:]])\1{10,}', '\1\1\1\1\1\1\1\1\1\1', 'g')
WHERE txt ~ '([[:punct:]])\1{10,}';

-- Find articles with high proportion of numbers or non-letters
SELECT id, LEFT(headline, 40) as title, LEFT(txt, 100) as text FROM articles
WHERE LENGTH(REGEXP_REPLACE(txt, '\w', '', 'g')) > LENGTH(txt) * 0.6
LIMIT 10;

-- Delete article with high proportion of non-word chars
DELETE FROM articles WHERE LENGTH(REGEXP_REPLACE(txt, '\w', '', 'g')) > LENGTH(txt) * 0.6;

-- Find articles which appear to be teasers
SELECT id, LEFT(headline, 40) as title, LEFT(txt, 100) as text
FROM articles
WHERE txt ~* '(pages?|read more on)\s+\d+' AND LENGTH(txt) < 100;

-- Delete teasers
DELETE FROM articles WHERE txt ~* '(pages?|read more on)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)' AND LENGTH(txt) < 100;

-- Delete empty articles
DELETE FROM articles WHERE txt ~* '^\s*\(Article text not provided\)\s*$';

-- Delete duplicated articles
DELETE FROM articles
WHERE id IN (
    SELECT
        id
    FROM (
        SELECT
            id,
            -- Count occurrences of each short_txt
            COUNT(*) OVER (PARTITION BY LEFT(txt, 100)) AS group_count,
            -- Assign a rank within each group based on article_date (oldest is 1)
            -- id is used as a tie-breaker
            ROW_NUMBER() OVER (PARTITION BY LEFT(txt, 100) ORDER BY article_date ASC, id ASC) AS rn
        FROM
            articles
    ) AS subquery_ranked_articles
    WHERE
        group_count >= 5 AND rn > 1 -- Target articles in groups of 5+ that are not the oldest
);

SELECT id
FROM articles
ORDER BY LENGTH(txt) DESC
LIMIT 1;

UPDATE articles
SET headline = category,
  category = ''
WHERE (headline IS NULL OR TRIM(headline) = '')
  AND (category IS NOT NULL AND TRIM(category) <> '');

UPDATE articles
SET category = ''
WHERE headline ILIKE category
  AND category IS NOT NULL
  AND category <> '';

UPDATE articles SET txt = strapline, strapline = '' WHERE (strapline <> '') AND (txt ~ '^\s*$')

DELETE FROM articles WHERE txt ~ '^\s*$';

SELECT id, headline, txt
FROM articles
WHERE LENGTH(txt) < 30;

UPDATE articles SET author = '' WHERE headline ILIKE author;

UPDATE articles SET strapline = headline, headline = '' WHERE LENGTH(headline) > 150 AND strapline IS NULL;

SELECT id, LEFT(headline, 50), txt
FROM articles
WHERE txt ~* '^\s*((See\s+)?page\s*\d+|\(Article text not provided\))\s*$';



-- Add a tsvector column to your articles table
ALTER TABLE articles ADD COLUMN search_vector tsvector;

-- Populate the search_vector column for existing articles.
-- This combines various text fields with different weights.
-- 'A' is the highest weight, 'D' is the lowest.
-- You can adjust the fields and weights based on your priorities.
UPDATE articles
SET search_vector =
    setweight(to_tsvector('english', coalesce(headline, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(strapline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(txt, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(author, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C');

-- Create a GIN index on the search_vector column for fast searching
CREATE INDEX articles_search_vector_idx ON articles USING GIN(search_vector);

-- Create automatic trigger
CREATE OR REPLACE FUNCTION articles_tsvector_update_trigger()
RETURNS trigger AS $$
BEGIN
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.headline, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.strapline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.txt, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(new.author, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.category, '')), 'C');
  return new;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON articles FOR EACH ROW EXECUTE FUNCTION articles_tsvector_update_trigger();

UPDATE articles SET headline = NULL WHERE TRIM(headline) = '';
UPDATE articles SET category = NULL WHERE TRIM(category) = '';
UPDATE articles SET strapline = NULL WHERE TRIM(strapline) = '';

-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add a 3072-dimensional vector column for Gemini embeddings
ALTER TABLE articles
ADD COLUMN gemini_embedding_001 vector(3072);
