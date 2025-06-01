// src/routes/article/[id]/+page.server.ts
import db from "$lib/server/db";
import type { Article } from "$lib/types/article";
import { error } from "@sveltejs/kit";
import pgvector from "pgvector/pg";
import { validate as uuidValidate, version as uuidVersion } from "uuid";
import type { PageServerLoad } from "./$types";

type ArticleRow = {
  id: string;
  publication: string;
  issue_no: number;
  page_no: number;
  article_date: string;
  headline: string | null;
  strapline: string | null;
  author: string | null;
  category: string | null;
  txt: string;
};

export const load: PageServerLoad = async ({ params }) => {
  const articleId = params.id;

  if (!(uuidValidate(articleId) && uuidVersion(articleId) === 4)) {
    error(404, { message: "Invalid article ID format." });
  }

  const mainArticleResult = await db.query<ArticleRow & { vector: unknown }>(
    "SELECT id, publication, issue_no, page_no, article_date, headline, strapline, author, category, txt, vector FROM articles WHERE id = $1",
    [articleId],
  );

  if (mainArticleResult.rows.length === 0) {
    error(404, { message: "Article not found" });
  }

  const articleData = mainArticleResult.rows[0];

  const article: Article = {
    id: articleData.id,
    publication: articleData.publication,
    issue_no: articleData.issue_no,
    page_no: articleData.page_no,
    article_date: new Date(articleData.article_date), // Ensure it's a Date object
    headline: articleData.headline,
    strapline: articleData.strapline,
    author: articleData.author,
    category: articleData.category,
    txt: articleData.txt,
  };

  const articleVector = articleData.vector;
  let recommendedArticles: Article[] = [];

  if (articleVector) {
    const recommendationsResult = await db.query<ArticleRow>(
      `SELECT id, publication, issue_no, page_no, article_date, headline, strapline, author, category, txt
             FROM articles
             WHERE id != $1
             ORDER BY vector <=> $2
             LIMIT 8`,
      [articleId, pgvector.toSql(articleVector)],
    );

    recommendedArticles = recommendationsResult.rows.map((row) => ({
      ...row,
      article_date: new Date(row.article_date),
    }));
  } else {
    console.warn(`Article ${articleId} does not have a vector. Cannot fetch recommendations.`);
  }

  return { article, recommendedArticles };
};
