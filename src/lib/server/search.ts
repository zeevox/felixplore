// src/lib/server/search.ts
import { error as SvelteKitError } from '@sveltejs/kit';
import type { Article } from '$lib/types/article'; // Assuming Article might include score fields

import db from '$lib/server/db';

export enum SortOrder {
    KeywordSearch = 'keyword',
    SemanticSearch = 'vector',
    Hybrid = 'rrf'
}

export interface SearchArticlesParams {
    searchQuery: string;
    currentPage: number;
    sortOrder: SortOrder;
    articlesPerPage: number;
    getQueryEmbeddingFn: (query: string) => Promise<number[] | null>;
    rrfK?: number;
}

export async function searchArticles({
    searchQuery,
    currentPage,
    sortOrder,
    articlesPerPage,
    getQueryEmbeddingFn,
    rrfK = 60
}: SearchArticlesParams): Promise<Article[]> {
    const offset = (currentPage - 1) * articlesPerPage;
    let finalDbQueryArgs: any[] = [];
    let dbQuery: string;

    // Base select fields for articles. Specific score/rank fields will be added by each query.
    const articleFields = `
        a.id, a.publication, a.issue_no, a.page_no, a.article_date,
        a.headline, a.strapline, a.author, a.category, a.txt
    `;

    if (sortOrder === SortOrder.Hybrid) {
        const embeddingVector = await getQueryEmbeddingFn(searchQuery);
        if (!embeddingVector || embeddingVector.length === 0) {
            // If embedding fails, we cannot perform the vector part of the hybrid search.
            SvelteKitError(
                503,
                `Semantic search component of Hybrid RRF for "${searchQuery}" is temporarily unavailable or failed to process. Please try a different search term or consider a different sort order.`
            );
        }
        const vectorString = `[${embeddingVector.join(',')}]`;

        // Determine how many results to fetch from each individual search before RRF.
        // Fetching more can lead to better RRF results but is more computationally expensive.
        // A common practice is to fetch a multiple of the final desired count, or a fixed moderate number.
        const intermediateLimit = Math.max(50, articlesPerPage * 3);

        finalDbQueryArgs = [
            searchQuery,         // $1: for keyword search (websearch_to_tsquery)
            vectorString,        // $2: for vector search (<=>)
            rrfK,                // $3: RRF K constant
            intermediateLimit,   // $4: LIMIT for individual keyword and vector searches
            articlesPerPage,     // $5: final LIMIT
            offset               // $6: final OFFSET
        ];

        dbQuery = `
            WITH keyword_search_results AS (
                SELECT
                    id,
                    RANK() OVER (ORDER BY ts_rank_cd(search_vector, websearch_to_tsquery('english', $1)) DESC) as rank
                FROM articles
                WHERE search_vector @@ websearch_to_tsquery('english', $1)
                ORDER BY rank ASC
                LIMIT $4
            ),
            vector_search_results AS (
                SELECT
                    id,
                    RANK() OVER (ORDER BY gemini_embedding_001 <=> $2 ASC) as rank
                FROM articles
                -- No specific WHERE clause for vector search unless pre-filtering is desired
                ORDER BY rank ASC
                LIMIT $4
            ),
            combined_ranked_ids AS (
                SELECT
                    COALESCE(ksr.id, vsr.id) as id,
                    (COALESCE(1.0 / ($3 + ksr.rank), 0.0) + COALESCE(1.0 / ($3 + vsr.rank), 0.0)) as rrf_score
                FROM keyword_search_results ksr
                FULL OUTER JOIN vector_search_results vsr ON ksr.id = vsr.id
                WHERE COALESCE(ksr.id, vsr.id) IS NOT NULL -- Ensure we have an ID
            )
            SELECT
                ${articleFields},
                cri.rrf_score
            FROM articles a
            JOIN combined_ranked_ids cri ON a.id = cri.id
            ORDER BY cri.rrf_score DESC, a.article_date DESC -- Primary sort by RRF score, secondary by date
            LIMIT $5 OFFSET $6;
        `;

    } else if (sortOrder === SortOrder.SemanticSearch) {
        const embeddingVector = await getQueryEmbeddingFn(searchQuery);
        if (!embeddingVector || embeddingVector.length === 0) {
            SvelteKitError(
                503,
                `Semantic search for "${searchQuery}" is temporarily unavailable or failed to process. Please try a different search term or sort order.`
            );
        }
        const vectorString = `[${embeddingVector.join(',')}]`;
        finalDbQueryArgs = [vectorString, articlesPerPage, offset];
        dbQuery = `
            SELECT
                ${articleFields},
                a.gemini_embedding_001 <=> $1 AS distance
            FROM articles a
            ORDER BY distance ASC, a.article_date DESC
            LIMIT $2 OFFSET $3;
        `;
    } else { // Default is SortOrder.KeywordSearch
        finalDbQueryArgs = [searchQuery, articlesPerPage, offset];
        dbQuery = `
            WITH search_params AS (
                SELECT websearch_to_tsquery('english', $1) AS query_tsvector
            )
            SELECT
                ${articleFields},
                ts_rank_cd(a.search_vector, sp.query_tsvector) AS rank
            FROM articles a, search_params sp
            WHERE a.search_vector @@ sp.query_tsvector
            ORDER BY rank DESC, a.article_date DESC
            LIMIT $2 OFFSET $3;
        `;
    }

    try {
        const result = await db.query(dbQuery, finalDbQueryArgs);
        const articlesData: Article[] = result.rows.map((row: any) => ({
            ...row,
            article_date: new Date(row.article_date)
        }));
        return articlesData;
    } catch (dbError: any) {
        console.error(`Database error in searchArticles (sortOrder: ${sortOrder}):`, dbError);
        console.error('Query:', dbQuery);
        console.error('Args:', finalDbQueryArgs);
        SvelteKitError(
            500,
            `Failed to retrieve articles (sort: ${sortOrder}) due to a database issue. Please ensure the database is accessible and the query is valid.`
        );
    }
}