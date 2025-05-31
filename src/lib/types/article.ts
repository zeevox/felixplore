// src/lib/types/article.ts

import type { UUIDTypes } from "uuid";

/**
 * Represents a newspaper or magazine article.
 *
 * @property publication Identifier for the publication, usually the newspaper name (e.g., "felix", "felix-daily-2011", "phoenix").
 * @property issue_no The identifying issue number (e.g., 49, 873, 1871).
 * @property page_no Page number, 1-indexed.
 * @property article_date The date of publication of this article, as an ISO date string (e.g., "2024-05-20").
 * @property headline Article title (e.g., "Imperial wins University Challenge for the 5th time").
 * @property strapline Strapline, also known as subhead or dek, if known (e.g., "UC team clinched the win at the 97th minute.").
 * @property author Author name, if known (e.g., "Mary Smith", "Bob Dylan").
 * @property category Section of the newspaper this article was published in, if known (e.g., "News", "Sport", "Comment").
 * @property txt The text of the article.
 */
export interface Article {
  id: UUIDTypes;
  publication: string;
  issue_no: number;
  page_no: number;
  article_date: Date;
  headline?: string | null;
  strapline?: string | null;
  author?: string | null;
  category?: string | null;
  txt: string;
}
