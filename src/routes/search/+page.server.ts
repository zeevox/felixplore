// src/routes/search/+page.server.ts
import db from '$lib/server/db';
import type { Article } from '$lib/types/article';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { ARTICLES_PER_PAGE } from '$lib/config';

// Define available sort orders
enum SortOrder {
    Relevance = 'relevance',
    DateAsc = 'date_asc',
    DateDesc = 'date_desc'
}

export const load: PageServerLoad = async ({ url }) => {
    const currentPage = Number(url.searchParams.get('page') || '1');
    const searchQuery = (url.searchParams.get('query') || '').trim();
    // Get sort order from URL, default to Relevance
    const sortOrderParam = url.searchParams.get('sort') as SortOrder;
    const currentSortOrder = Object.values(SortOrder).includes(sortOrderParam) ? sortOrderParam : SortOrder.Relevance;

    if (!searchQuery) {
        redirect(307, '/');
    }

    if (currentPage < 1) {
        redirect(307, `/search?query=${encodeURIComponent(searchQuery)}&page=1&sort=${currentSortOrder}`);
    }

    let articles: Article[] = [];
    let totalArticles = 0;
    let totalPages = 0;

    try {
        const offset = (currentPage - 1) * ARTICLES_PER_PAGE;

        let orderByClause = '';
        switch (currentSortOrder) {
            case SortOrder.DateAsc:
                orderByClause = 'ORDER BY a.article_date ASC, rank DESC';
                break;
            case SortOrder.DateDesc:
                orderByClause = 'ORDER BY a.article_date DESC, rank DESC';
                break;
            case SortOrder.Relevance:
            default:
                orderByClause = 'ORDER BY rank DESC, a.article_date DESC';
                break;
        }

        const dbQuery = `
            WITH search_params AS (
                SELECT websearch_to_tsquery('english', $1) AS query_tsvector
            )
            SELECT
                a.id,
                a.publication,
                a.issue_no,
                a.page_no,
                a.article_date,
                a.headline,
                a.strapline,
                a.author,
                a.category,
                a.txt,
                ts_rank_cd(a.search_vector, sp.query_tsvector) AS rank,
                COUNT(*) OVER() AS total_count
            FROM articles a, search_params sp
            WHERE a.search_vector @@ sp.query_tsvector
            ${orderByClause}
            LIMIT $2 OFFSET $3;
        `;

        const result = await db.query(dbQuery, [searchQuery, ARTICLES_PER_PAGE, offset]);

        if (result.rows.length > 0) {
            articles = result.rows.map(row => ({
                ...row,
                article_date: new Date(row.article_date),
            }));
            totalArticles = parseInt(result.rows[0].total_count, 10);
            totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
        } else {
            totalArticles = 0;
            totalPages = 0;
        }

        if (currentPage > totalPages && totalPages > 0) {
            redirect(307, `/search?query=${encodeURIComponent(searchQuery)}&page=${totalPages}&sort=${currentSortOrder}`);
        }

    } catch (err: any) {
        console.error('Database query error:', err);
        return fail(500, {
            error: 'Could not retrieve articles. A server error occurred.',
            articles: [],
            searchQuery,
            currentPage,
            totalPages: 0,
            totalArticles: 0,
            sortOrder: currentSortOrder, // Pass current sort order even on error
        });
    }

    return {
        articles,
        searchQuery,
        currentPage,
        totalPages,
        totalArticles,
        sortOrder: currentSortOrder, // Pass current sort order
    };
};

export const actions: Actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const query = (data.get('searchQuery') as string || '').trim();

        if (!query) {
            redirect(303, `/`);
        }
        // New searches from the main search bar will default to 'relevance' sort
        redirect(303, `/search?query=${encodeURIComponent(query)}&page=1&sort=${SortOrder.Relevance}`);
    },
};