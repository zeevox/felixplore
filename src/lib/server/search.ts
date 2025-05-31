// src/lib/server/search.ts
import type { Article } from "$lib/types/article";
import { error as SvelteKitError } from "@sveltejs/kit";

import db from "$lib/server/db";
import { getQueryEmbedding, SIMILARITY_THRESHOLD } from "$lib/server/embed";

export enum SortOrder {
  KeywordSearch = "keyword",
  SemanticSearch = "vector",
  Hybrid = "rrf",
}

export interface SearchArticlesParams {
  searchQuery: string;
  currentPage: number;
  sortOrder: SortOrder;
  articlesPerPage: number;
  rrfK?: number;
  startDate?: string; // ISO date string for start date (inclusive)
  endDate?: string; // ISO date string for end date (inclusive)
}

export async function searchArticles({
  searchQuery,
  currentPage,
  sortOrder,
  articlesPerPage,
  rrfK = 60,
  startDate,
  endDate,
}: SearchArticlesParams): Promise<Article[]> {
  const offset = (currentPage - 1) * articlesPerPage;
  const finalDbQueryArgs: unknown[] = [];
  let dbQuery: string;
  let pCurrent = 1; // Current parameter index for the SQL query string

  const articleFields = `
        a.id, a.publication, a.issue_no, a.page_no, a.article_date,
        a.headline, a.strapline, a.author, a.category, a.txt
    `;

  // These will store the $N index if the parameter is present
  let startDateSqlParamIdx: number | undefined;
  let endDateSqlParamIdx: number | undefined;
  let similarityThresholdParamIdx: number | undefined; // For the SIMILARITY_THRESHOLD value

  // Helper function to build the WHERE clause part for filtering
  const buildDynamicWhereClause = (
    baseConditions: string[],
    tableAlias: string = "articles",
    vectorEmbeddingParamIdx?: number, // Index of the vector embedding parameter for similarity check
  ): string => {
    const conditions = [...baseConditions];

    // Add similarity threshold condition if applicable (for vector/hybrid searches)
    if (vectorEmbeddingParamIdx && similarityThresholdParamIdx) {
      // SQL: distance < (1 - THRESHOLD_VALUE)
      conditions.push(
        `${tableAlias}.gemini_embedding_001 <=> $${vectorEmbeddingParamIdx} < (1 - $${similarityThresholdParamIdx}::double precision)`,
      );
    }

    if (startDateSqlParamIdx) {
      conditions.push(`${tableAlias}.article_date >= $${startDateSqlParamIdx}`);
    }
    if (endDateSqlParamIdx) {
      conditions.push(`${tableAlias}.article_date <= $${endDateSqlParamIdx}`);
    }
    return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  };

  if (sortOrder === SortOrder.Hybrid) {
    finalDbQueryArgs.push(searchQuery); // For websearch_to_tsquery
    const keywordTsQueryIdx = pCurrent++;

    const embeddingVector = await getQueryEmbedding(searchQuery);
    if (!embeddingVector || embeddingVector.length === 0) {
      SvelteKitError(
        503,
        `Semantic search component of Hybrid RRF for "${searchQuery}" is temporarily unavailable or failed to process. Please try a different search term or consider a different sort order.`,
      );
    }
    const vectorString = `[${embeddingVector.join(",")}]`;
    finalDbQueryArgs.push(vectorString); // For vector search
    const embeddingVectorParamIdx = pCurrent++;

    finalDbQueryArgs.push(SIMILARITY_THRESHOLD); // Add threshold value
    similarityThresholdParamIdx = pCurrent++; // Store its SQL parameter index

    if (startDate) {
      finalDbQueryArgs.push(startDate);
      startDateSqlParamIdx = pCurrent++;
    }
    if (endDate) {
      finalDbQueryArgs.push(endDate);
      endDateSqlParamIdx = pCurrent++;
    }

    finalDbQueryArgs.push(rrfK);
    const rrfKIdx = pCurrent++;

    const intermediateLimit = Math.max(50, articlesPerPage * 3);
    finalDbQueryArgs.push(intermediateLimit);
    const intermediateLimitIdx = pCurrent++;

    finalDbQueryArgs.push(articlesPerPage);
    const finalLimitIdx = pCurrent++;

    finalDbQueryArgs.push(offset);
    const finalOffsetIdx = pCurrent++;

    const keywordCteBaseConditions = [
      `articles.search_vector @@ websearch_to_tsquery('english', $${keywordTsQueryIdx})`,
    ];
    // For keyword_search_results, similarity threshold is not applicable. Dates are.
    // No vectorEmbeddingParamIdx is passed, so similarity condition won't be added.
    const keywordCteWhereClause = buildDynamicWhereClause(keywordCteBaseConditions, "articles");

    // For vector_search_results, similarity threshold IS applicable. Dates are also.
    const vectorCteBaseConditions: string[] = [];
    // Pass embeddingVectorParamIdx to enable similarity condition in buildDynamicWhereClause
    const vectorCteWhereClause = buildDynamicWhereClause(
      vectorCteBaseConditions,
      "articles",
      embeddingVectorParamIdx,
    );

    dbQuery = `
            WITH keyword_search_results AS (
                SELECT
                    id,
                    RANK() OVER (ORDER BY ts_rank_cd(search_vector, websearch_to_tsquery('english', $${keywordTsQueryIdx})) DESC) as rank
                FROM articles
                ${keywordCteWhereClause} -- Date filters applied here
                ORDER BY rank ASC
                LIMIT $${intermediateLimitIdx}
            ),
            vector_search_results AS (
                SELECT
                    id,
                    RANK() OVER (ORDER BY gemini_embedding_001 <=> $${embeddingVectorParamIdx} ASC) as rank
                FROM articles
                ${vectorCteWhereClause} -- Similarity and Date filters applied here
                ORDER BY rank ASC
                LIMIT $${intermediateLimitIdx}
            ),
            combined_ranked_ids AS (
                SELECT
                    COALESCE(ksr.id, vsr.id) as id,
                    (COALESCE(1.0 / ($${rrfKIdx} + ksr.rank), 0.0) + COALESCE(1.0 / ($${rrfKIdx} + vsr.rank), 0.0)) as rrf_score
                FROM keyword_search_results ksr
                FULL OUTER JOIN vector_search_results vsr ON ksr.id = vsr.id
                WHERE COALESCE(ksr.id, vsr.id) IS NOT NULL
            )
            SELECT
                ${articleFields},
                cri.rrf_score
            FROM articles a
            JOIN combined_ranked_ids cri ON a.id = cri.id
            ORDER BY cri.rrf_score DESC, a.article_date DESC
            LIMIT $${finalLimitIdx} OFFSET $${finalOffsetIdx};
        `;
  } else if (sortOrder === SortOrder.SemanticSearch) {
    const embeddingVector = await getQueryEmbedding(searchQuery);
    if (!embeddingVector || embeddingVector.length === 0) {
      SvelteKitError(
        503,
        `Semantic search for "${searchQuery}" is temporarily unavailable or failed to process. Please try a different search term or sort order.`,
      );
    }
    const vectorString = `[${embeddingVector.join(",")}]`;
    finalDbQueryArgs.push(vectorString);
    const embeddingVectorParamIdx = pCurrent++;

    finalDbQueryArgs.push(SIMILARITY_THRESHOLD); // Add threshold value
    similarityThresholdParamIdx = pCurrent++; // Store its SQL parameter index

    if (startDate) {
      finalDbQueryArgs.push(startDate);
      startDateSqlParamIdx = pCurrent++;
    }
    if (endDate) {
      finalDbQueryArgs.push(endDate);
      endDateSqlParamIdx = pCurrent++;
    }

    finalDbQueryArgs.push(articlesPerPage);
    const limitIdx = pCurrent++;
    finalDbQueryArgs.push(offset);
    const offsetIdx = pCurrent++;

    const semanticSearchBaseConditions: string[] = [];
    // Pass embeddingVectorParamIdx to enable similarity condition in buildDynamicWhereClause
    const whereClauseSql = buildDynamicWhereClause(
      semanticSearchBaseConditions,
      "a",
      embeddingVectorParamIdx,
    );

    dbQuery = `
            SELECT
                ${articleFields},
                a.gemini_embedding_001 <=> $${embeddingVectorParamIdx} AS distance
            FROM articles a
            ${whereClauseSql} -- Similarity and Date filters applied here
            ORDER BY distance ASC, a.article_date DESC
            LIMIT $${limitIdx} OFFSET $${offsetIdx};
        `;
  } else {
    // Default is SortOrder.KeywordSearch
    finalDbQueryArgs.push(searchQuery);
    const keywordTsQueryIdx = pCurrent++;

    if (startDate) {
      finalDbQueryArgs.push(startDate);
      startDateSqlParamIdx = pCurrent++;
    }
    if (endDate) {
      finalDbQueryArgs.push(endDate);
      endDateSqlParamIdx = pCurrent++;
    }

    finalDbQueryArgs.push(articlesPerPage);
    const limitIdx = pCurrent++;
    finalDbQueryArgs.push(offset);
    const offsetIdx = pCurrent++;

    const keywordSearchBaseConditions = [`a.search_vector @@ sp.query_tsvector`];
    // No vectorEmbeddingParamIdx passed, so similarity condition won't be added.
    const whereClauseSql = buildDynamicWhereClause(keywordSearchBaseConditions, "a");

    dbQuery = `
            WITH search_params AS (
                SELECT websearch_to_tsquery('english', $${keywordTsQueryIdx}) AS query_tsvector
            )
            SELECT
                ${articleFields},
                ts_rank_cd(a.search_vector, sp.query_tsvector) AS rank
            FROM articles a, search_params sp
            ${whereClauseSql} -- Date filters applied here
            ORDER BY rank DESC, a.article_date DESC
            LIMIT $${limitIdx} OFFSET $${offsetIdx};
        `;
  }

  try {
    const result = await db.query<Article>(dbQuery, finalDbQueryArgs);
    return result.rows.map((row) => ({
      ...row,
      article_date: new Date(row.article_date),
    }));
  } catch (dbError: unknown) {
    console.error(
      `Database error in searchArticles (sortOrder: ${sortOrder}, startDate: ${startDate}, endDate: ${endDate}):`,
      dbError,
    );
    console.error("Query:", dbQuery);
    console.error("Args:", finalDbQueryArgs);
    SvelteKitError(
      500,
      `Failed to retrieve articles (sort: ${sortOrder}) due to a database issue. Please ensure the database is accessible and the query is valid.`,
    );
  }
}
