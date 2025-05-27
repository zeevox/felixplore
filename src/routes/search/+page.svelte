<!-- src/routes/search/+page.svelte -->
<script lang="ts">
    import Search from '@lucide/svelte/icons/search';
    import { Pagination } from '@skeletonlabs/skeleton-svelte';
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { ARTICLES_PER_PAGE } from '$lib/config';
    import IconArrowLeft from '@lucide/svelte/icons/arrow-left';
    import IconArrowRight from '@lucide/svelte/icons/arrow-right';
    import IconEllipsis from '@lucide/svelte/icons/ellipsis';
    import IconFirst from '@lucide/svelte/icons/chevrons-left';
    import IconLast from '@lucide/svelte/icons/chevrons-right';
    import ArticleResult from '$lib/components/ArticleResult.svelte';

    let { data } = $props();

    // Reactive statements to ensure data updates when props change
    let articles = $derived(data.articles);
    let searchQuery = $derived(data.searchQuery);
    let currentPage = $derived(data.currentPage);
    let totalPages = $derived(data.totalPages);
    let totalArticles = $derived(data.totalArticles);

    function handlePageChange(event: { page: number }) {
        const newPage = event.page;
        const params = new URLSearchParams(window.location.search);
        params.set('page', newPage.toString());
        if (searchQuery) {
            params.set('query', searchQuery);
        } else {
            params.delete('query'); // Remove query if it's empty for cleaner URLs
        }
        goto(`/search?${params.toString()}`, { keepFocus: true, invalidateAll: true });
    }
</script>

<div class="flex h-full flex-col">
    <header class="sticky top-0 z-10 border-b border-surface-200-800 bg-surface-50-950/80 p-4 backdrop-blur-sm">
        <div class="container mx-auto flex max-w-5xl flex-col gap-2 items-stretch md:flex-row md:items-center md:gap-4 px-4 md:px-8">
            <a href="/" class="text-xl font-semibold md:text-2xl md:mr-4 self-center">Felixplore</a>
            <form method="POST" use:enhance class="flex-grow">
                <label class="label w-full">
                    <span class="label-text sr-only">Search the archive</span>
                    <div
                        class="input-group preset-filled-surface-100-900 focus-within:ring-primary-500 grid-cols-[auto_1fr_auto] rounded-full shadow-sm transition-shadow duration-200 ease-in-out focus-within:shadow-md focus-within:ring-1 hover:shadow-md"
                    >
                        <div class="ig-cell text-surface-500-400 flex items-center justify-center pr-1 pl-3 md:pl-4">
                            <Search size={18} />
                        </div>
                        <input
                            type="search"
                            name="searchQuery"
                            class="ig-input resize-none overflow-hidden border-none bg-transparent py-2.5 text-sm leading-tight focus:ring-0 md:text-base"
                            placeholder="Search the archive..."
                            bind:value={searchQuery}
                            style="min-height: 2.25rem;"
                        />
                        {#if searchQuery}
                            <div class="ig-cell flex items-center justify-center pr-2 pl-1">
                                <button
                                    type="submit"
                                    title="Search"
                                    class="btn-icon preset-tonal-primary hover:preset-filled-primary text-primary-500 rounded-full p-1.5"
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

    <main class="container mx-auto flex-grow space-y-8 p-4 md:p-8 max-w-5xl">
        {#if articles && articles.length > 0}
            <section class="space-y-6">
                <p class="text-sm text-surface-600-300">Found {totalArticles} results</p>
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
        {:else if searchQuery}
            <p class="text-surface-600-300 pt-10 text-center text-lg">
                No articles found matching your query "{searchQuery}".
            </p>
        {:else}
             <div class="flex h-full flex-col items-center justify-center pt-16 text-center">
                <Search size={64} class="text-surface-400-500 mb-4" />
                <p class="text-lg text-surface-500-400">
                    Search the Felix archive.
                </p>
            </div>
        {/if}
    </main>
</div>