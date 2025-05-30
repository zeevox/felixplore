// src/routes/search/+page.server.js
import type { Article } from '$lib/types/article';
import { error as SvelteKitError, redirect, isRedirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { ARTICLES_PER_PAGE } from '$lib/config';
import { getQueryEmbedding } from '$lib/server/embed';
import { searchArticles, SortOrder } from '$lib/server/search';

interface SearchPageData {
    articles: Promise<Article[]>;
    searchQuery: string;
    currentPage: number;
    sortOrder: SortOrder;
}

export const load: PageServerLoad<SearchPageData> = async ({ url, depends }) => {
    // Register dependencies for SvelteKit's invalidation mechanism
    depends('app:search:query:' + url.searchParams.get('query'));
    depends('app:search:page:' + url.searchParams.get('page'));
    depends('app:search:sort:' + url.searchParams.get('sort'));

    const currentPageParam = url.searchParams.get('page') || '1';
    const currentPage = Number(currentPageParam);
    const searchQuery = (url.searchParams.get('query') || '').trim();
    const sortOrderParam = url.searchParams.get('sort') as string | null;

    const isValidSortOrder = (value: string | null): value is SortOrder => {
        return value !== null && Object.values(SortOrder).includes(value as SortOrder);
    };

    const currentSortOrder = isValidSortOrder(sortOrderParam)
        ? sortOrderParam
        : SortOrder.Hybrid;

    if (!searchQuery) {
        redirect(307, '/');
    }

    if (!Number.isInteger(currentPage) || currentPage < 1) {
        const newParams = new URLSearchParams(url.searchParams);
        newParams.set('query', searchQuery); // Ensure current query is set
        newParams.set('page', '1');
        newParams.set('sort', currentSortOrder); // Ensure current sort is set
        redirect(307, `/search?${newParams.toString()}`);
    }

    const articlesPromise = (async (): Promise<Article[]> => {
        try {
            const articlesData = await searchArticles({
                searchQuery,
                currentPage,
                sortOrder: currentSortOrder,
                articlesPerPage: ARTICLES_PER_PAGE,
                getQueryEmbeddingFn: getQueryEmbedding
            });

            if (articlesData.length === 0 && currentPage > 1) {
                const newParams = new URLSearchParams(url.searchParams);
                newParams.set('query', searchQuery);
                newParams.set('page', '1');
                newParams.set('sort', currentSortOrder);
                redirect(307, `/search?${newParams.toString()}`);
            }
            return articlesData;
        } catch (err) {
            // Rethrow SvelteKit recognized errors (HttpError, Redirect)
            if (isRedirect(err) || (err && typeof err === 'object' && 'status' in err && 'body' in err)) {
                throw err;
            }
            // Log unexpected errors from the IIFE and throw a generic SvelteKit error
            console.error('Unexpected error during articlesPromise execution:', err);
            SvelteKitError(500, 'An internal error occurred while preparing articles. Please try again.');
        }
    })();

    try {
        return {
            articles: articlesPromise, // Stream the promise
            searchQuery,
            currentPage,
            sortOrder: currentSortOrder,
        };
    } catch (err: unknown) {
        // This primarily catches synchronous errors or issues with the load function structure itself.
        if (isRedirect(err)) {
            throw err;
        }
        if (err && typeof err === 'object' && 'status' in err && 'body' in err) { // HttpError
            throw err;
        }
        console.error('Unexpected error in search load function structure:', err);
        SvelteKitError(500, 'Could not process search request due to a server configuration issue.');
    }
};

export const actions: Actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const query = (data.get('searchQuery') as string || '').trim();
        const submittedSortOrder = data.get('sortOrder') as string | null;

        if (!query) {
            redirect(303, `/`);
        }

        const isValidSortOrder = (value: string | null): value is SortOrder => {
            return value !== null && Object.values(SortOrder).includes(value as SortOrder);
        };
        const sortToUse = isValidSortOrder(submittedSortOrder)
            ? submittedSortOrder
            : SortOrder.Hybrid;

        const params = new URLSearchParams();
        params.set('query', query);
        params.set('page', '1');
        params.set('sort', sortToUse);
        redirect(303, `/search?${params.toString()}`);
    },
};