<script lang="ts">
    import Search from '@lucide/svelte/icons/search';
    import { Pagination } from '@skeletonlabs/skeleton-svelte';
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { ARTICLES_PER_PAGE } from '$lib/config';
    // Assuming SortOrder enum might be imported if shared, or use string literals
    import IconArrowLeft from '@lucide/svelte/icons/arrow-left';
    import IconArrowRight from '@lucide/svelte/icons/arrow-right';
    import IconEllipsis from '@lucide/svelte/icons/ellipsis';
    import IconFirst from '@lucide/svelte/icons/chevrons-left';
    import IconLast from '@lucide/svelte/icons/chevrons-right';
    import ArticleResult from '$lib/components/ArticleResult.svelte';

    let { data } = $props();

    // Reactive statements for data from server
    let articles = $derived(data.articles);
    let currentSearchQuery = $derived(data.searchQuery);
    let currentPage = $derived(data.currentPage);
    let totalPages = $derived(data.totalPages);
    let totalArticles = $derived(data.totalArticles);
    let serverSortOrder = $derived(data.sortOrder || 'relevance'); // Default to 'relevance'

    const sortOptions = [
        { value: 'relevance', label: 'Relevance' },
        { value: 'date_desc', label: 'Date (Newest)' },
        { value: 'date_asc', label: 'Date (Oldest)' }
    ];

    function handlePageChange(event: { page: number }) {
        const newPage = event.page;
        const params = new URLSearchParams(window.location.search);
        params.set('page', newPage.toString());
        // currentSearchQuery and serverSortOrder are derived and reflect current URL state
        if (currentSearchQuery) {
            params.set('query', currentSearchQuery);
        }
        params.set('sort', serverSortOrder); // Use the sort order from data
        goto(`/search?${params.toString()}`, { keepFocus: true, invalidateAll: true });
    }

    function handleSortChange(event: Event) {
        const newSortValue = (event.currentTarget as HTMLSelectElement).value;
        const params = new URLSearchParams();
        if (currentSearchQuery) {
            params.set('query', currentSearchQuery);
        }
        params.set('sort', newSortValue);
        params.set('page', '1'); // Reset to page 1 on sort change
        goto(`/search?${params.toString()}`, { keepFocus: true, invalidateAll: true });
    }
</script>

<div class="bg-surface-50-950 text-surface-900-50 flex h-full flex-col">
    <header
        class="border-surface-200-800 bg-surface-100-900/80 sticky top-0 z-10 border-b p-4 backdrop-blur-sm"
    >
        <div
            class="container mx-auto flex max-w-5xl flex-col items-stretch gap-2 px-4 md:flex-row md:items-center md:gap-4 md:px-8"
        >
            <a
                href="/"
                class="hover:text-primary-500 self-center text-xl font-semibold transition-colors md:mr-4 md:text-2xl"
                >Felixplore</a
            >
            <form method="POST" use:enhance class="flex-grow">
                <label class="label w-full">
                    <span class="label-text sr-only">Search the archive</span>
                    <div
                        class="input-group preset-filled-surface-200-800 focus-within:ring-primary-500 grid-cols-[auto_1fr_auto] rounded-full shadow-sm transition-all duration-200 ease-in-out focus-within:shadow-lg focus-within:ring-2 hover:shadow-md"
                    >
                        <div
                            class="ig-cell text-surface-500-400 flex items-center justify-center pr-1 pl-3 md:pl-4"
                        >
                            <Search size={18} />
                        </div>
                        <input
                            type="search"
                            name="searchQuery"
                            class="ig-input placeholder:text-surface-400-600 resize-none overflow-hidden border-none bg-transparent py-2.5 text-sm leading-tight focus:ring-0 md:text-base"
                            placeholder="Search the archive..."
                            value={currentSearchQuery}
                            style="min-height: 2.25rem;"
                        />
                        {#if currentSearchQuery}
                            <div class="ig-cell flex items-center justify-center pr-2 pl-1">
                                <button
                                    type="submit"
                                    title="Search"
                                    class="btn-icon preset-tonal-primary hover:preset-filled-primary focus:preset-filled-primary text-primary-500 rounded-full p-1.5 transition-colors"
                                >
                                    <Search size={18} />
                                </button>
                            </div>
                        {/if}
                    </div>
                </label>
                <button type="submit" class="btn preset-filled-primary sr-only"> Search </button>
            </form>
        </div>
    </header>

    <main class="container mx-auto max-w-5xl flex-grow space-y-8 p-4 md:p-8">
        {#if articles && articles.length > 0}
            <section class="space-y-6">
                <div
                    class="border-surface-200-800 flex flex-col items-center justify-between gap-4 border-b pb-4 md:flex-row"
                >
                    <p class="text-surface-800-200 text-sm">
                        Found {totalArticles} results for "{currentSearchQuery}"
                    </p>
                    <div class="flex items-center gap-2">
                        <label for="sort-order-select" class="text-surface-800-200 text-sm"
                            >Sort&nbsp;by:</label
                        >
                        <select
                            id="sort-order-select"
                            value={serverSortOrder}
                            onchange={handleSortChange}
                            class="select select-sm preset-filled-surface-200-800 focus:ring-primary-500 border-surface-300-700 hover:border-primary-500/50 rounded-md py-1.5 shadow-sm transition-colors"
                        >
                            {#each sortOptions as option}
                                <option
                                    value={option.value}
                                    selected={option.value === serverSortOrder}
                                    >{option.label}</option
                                >
                            {/each}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-6">
                    {#each articles as article (article.id)}
                        <ArticleResult {article} />
                    {/each}
                </div>

                {#if totalPages && totalPages > 1}
                    <footer class="flex justify-center pt-8">
                        <Pagination
                            data={articles}
                            count={totalArticles}
                            page={currentPage}
                            onPageChange={handlePageChange}
                            pageSize={ARTICLES_PER_PAGE}
                            showFirstLastButtons
                            alternative
                            base="btn-group preset-filled-surface-100-900"
                            buttonActive="preset-filled-primary-500"
                            buttonInactive="hover:preset-tonal-surface-300-700"
                        >
                            {#snippet labelEllipsis()}<IconEllipsis class="size-4" />{/snippet}
                            {#snippet labelNext()}<IconArrowRight class="size-4" />{/snippet}
                            {#snippet labelPrevious()}<IconArrowLeft class="size-4" />{/snippet}
                            {#snippet labelFirst()}<IconFirst class="size-4" />{/snippet}
                            {#snippet labelLast()}<IconLast class="size-4" />{/snippet}
                        </Pagination>
                    </footer>
                {/if}
            </section>
        {:else if currentSearchQuery}
            <div class="flex flex-col items-center justify-center pt-16 text-center">
                <Search size={48} class="text-surface-400-500 mb-6 opacity-75" />
                <p class="text-surface-700-300 mb-2 text-xl">
                    No articles found for "{currentSearchQuery}"
                </p>
                <p class="text-surface-500-400 text-sm">
                    Try refining your search terms or check for typos.
                </p>
            </div>
        {:else}
            <div class="flex h-full flex-col items-center justify-center pt-16 text-center">
                <Search size={64} class="text-surface-400-500 mb-4 opacity-50" />
                <p class="text-surface-500-400 text-lg">Search the Felix archive.</p>
            </div>
        {/if}
    </main>
</div>
