// src/routes/+page.server.ts
import db from '$lib/server/db';
import type { Article } from '$lib/types/article';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { ARTICLES_PER_PAGE } from '$lib/config';

export const load: PageServerLoad = async ({ url }) => {
    const currentPage = Number(url.searchParams.get('page') || '1');
    const searchQuery = url.searchParams.get('query') || '';

    if (currentPage < 1) {
        redirect(307, `/`);
    }

    let articles: Article[] = [];
    let totalArticles = 0;
    let totalPages = 0;

    if (searchQuery) {
        try {
            const offset = (currentPage - 1) * ARTICLES_PER_PAGE;

            const articlesQuery = `
                WITH search_query AS (SELECT websearch_to_tsquery('english', $1) AS q)
                SELECT
                    id,
                    publication,
                    issue_no,
                    page_no,
                    article_date,
                    headline,
                    strapline,
                    author,
                    category,
                    txt,
                    ts_rank_cd(articles.search_vector, (SELECT q FROM search_query)) AS rank
                FROM articles, search_query
                WHERE articles.search_vector @@ (SELECT q FROM search_query)
                ORDER BY rank DESC, article_date DESC
                LIMIT $2 OFFSET $3
            `;

            const articlesResult = await db.query(articlesQuery, [searchQuery, ARTICLES_PER_PAGE, offset]);
            articles = articlesResult.rows.map(row => ({
                ...row,
                article_date: new Date(row.article_date), // Ensure it's a Date object
            }));

            const totalQuery = `
                WITH search_query AS (SELECT websearch_to_tsquery('english', $1) AS q)
                SELECT COUNT(*) AS count
                FROM articles, search_query
                WHERE articles.search_vector @@ (SELECT q FROM search_query)
            `;
            const totalResult = await db.query(totalQuery, [searchQuery]);
            totalArticles = parseInt(totalResult.rows[0].count, 10);
            totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);

            if (currentPage > totalPages && totalPages > 0) {
                redirect(307, `/?query=${encodeURIComponent(searchQuery)}&page=${totalPages}`);
            }

        } catch (err: any) {
            console.error('Database query error:', err);
            return fail(500, { error: 'Could not retrieve articles due to a server error.' });
        }
    }

    return {
        articles,
        searchQuery,
        currentPage,
        totalPages,
        totalArticles,
    };
};

export const actions: Actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const query = data.get('searchQuery') as string;

        if (!query || query.trim() === '') {
            redirect(303, `/`);
        }
        redirect(303, `/?query=${encodeURIComponent(query)}&page=1`);
    },
};