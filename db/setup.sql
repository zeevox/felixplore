
-- Enable the uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add the UUID column with a default value
ALTER TABLE articles
ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();

-- Retrieve a random UUID and article headline from the articles table
SELECT id, headline
FROM articles
ORDER BY RANDOM()
LIMIT 1;

UPDATE articles SET page_no = page_no - 1 WHERE issue_no >= 1299;
UPDATE articles SET page_no = page_no - 1 WHERE publication = 'felix-daily-2011';

UPDATE articles SET headline = '' WHERE headline = 'Untitled';

UPDATE articles
SET category = ''
WHERE LOWER(category) IN (
  'unspecified', 'uncategorised', 'not specified', 'miscellaneous', 'untitled',
  'various', '(not specified)', 'none', 'n/a', 'other', 'unknown', 'unk', '--', 'felix', '""'
);

UPDATE articles
SET author = ''
WHERE LOWER(author) IN (
  ' ',  'n/a', 'unknown', 'advertisement', 'none', 'staff'
);

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