<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { ARTICLES_PER_PAGE } from "$lib/config";
  import ArticleResult from "$lib/components/ArticleResult.svelte";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import ServerCrash from "@lucide/svelte/icons/server-crash";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import { page } from "$app/state";
  import type { Article } from "$lib/types/article";
  import SquareArrowOutUpRight from "@lucide/svelte/icons/square-arrow-out-up-right";

  // data can be undefined if load fails very early before returning its structure
  let { data } = $props<{
    articles?: Promise<Article[]>;
    searchQuery?: string;
    currentPage?: number;
    sortOrder?: string; // Should match SortOrder enum values from server
    startYear?: string;
    endYear?: string;
  }>();

  const pageError = $derived(page.error);

  let currentSearchQuery = $derived(data?.searchQuery ?? page.url.searchParams.get("query") ?? "");
  let currentPage = $derived(
    data?.currentPage ?? parseInt(page.url.searchParams.get("page") || "1"),
  );
  let serverSortOrder = $derived(data?.sortOrder ?? page.url.searchParams.get("sort") ?? "rrf");
  let currentStartYear = $derived(data?.startYear ?? page.url.searchParams.get("startYear") ?? "");
  let currentEndYear = $derived(data?.endYear ?? page.url.searchParams.get("endYear") ?? "");

  const MIN_YEAR = 1949;
  const MAX_YEAR = 2025;

  const availableYears = $derived(
    Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => (MIN_YEAR + i).toString()),
  );
  const startYearOptions = $derived(["", ...availableYears]); // Empty string for "Any Year"
  const endYearOptions = $derived(["", ...availableYears]); // Empty string for "Any Year"

  const sortOptions = [
    { value: "rrf", label: "All results" },
    { value: "keyword", label: "Exact match" },
    { value: "vector", label: "Same concept" },
  ];

  function handleNextPage() {
    const newPage = currentPage + 1;
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    goto(`/search?${params.toString()}`, { keepFocus: true });
  }

  function handleFilterChange() {
    const params = new URLSearchParams(window.location.search);

    // Update sort order from its select element directly
    const sortSelect = document.getElementById("sort-order-select") as HTMLSelectElement;
    if (sortSelect) params.set("sort", sortSelect.value);

    // Update start year from its select element
    const startYearSelect = document.getElementById("start-year-select") as HTMLSelectElement;
    if (startYearSelect) {
      if (startYearSelect.value) params.set("startYear", startYearSelect.value);
      else params.delete("startYear");
    }

    // Update end year from its select element
    const endYearSelect = document.getElementById("end-year-select") as HTMLSelectElement;
    if (endYearSelect) {
      if (endYearSelect.value) params.set("endYear", endYearSelect.value);
      else params.delete("endYear");
    }

    params.set("page", "1"); // Reset to page 1 on any filter change
    goto(`/search?${params.toString()}`, { keepFocus: true });
  }
</script>

<svelte:head>
  <title>Search: {pageError ? "Error" : currentSearchQuery || "Archive"}</title>
  {#if currentSearchQuery && !pageError}
    <meta
      name="description"
      content="Search results for {currentSearchQuery} in the Felixplore archive."
    />
  {/if}
</svelte:head>

<div class="flex min-h-screen flex-col">
  <header
    class="border-surface-200-800 bg-surface-100-900/80 sticky top-0 z-10 border-b p-4 shadow-xs backdrop-blur-sm"
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
        <input type="hidden" name="sortOrder" value={serverSortOrder} />
        <input type="hidden" name="startYear" value={currentStartYear} />
        <input type="hidden" name="endYear" value={currentEndYear} />
        <label class="w-full">
          <span class="sr-only">Search the archive</span>
          <div
            class="input-group focus-within:ring-primary-500/70 grid transform grid-cols-[1fr_auto]
                               rounded-full bg-white/70 p-2 shadow-md
                               backdrop-blur-lg transition-all
                               duration-300 ease-out focus-within:ring-2 hover:shadow-lg dark:bg-black/50"
          >
            <input
              type="search"
              name="searchQuery"
              bind:value={currentSearchQuery}
              class="ig-input text-surface-900 dark:text-surface-100
                                   placeholder:text-surface-500 dark:placeholder:text-surface-400
                                   resize-none truncate overflow-hidden border-none bg-transparent
                                   px-3 text-sm leading-tight
                                   focus:ring-0 md:text-base"
              placeholder="Search the archive..."
              style="min-height: 2.25rem;"
              aria-label="Search the archive"
            />
            {#if currentSearchQuery}
              <div class="ig-cell flex items-center justify-center px-2">
                <button
                  type="submit"
                  title="Search"
                  aria-label="Submit search"
                  class="btn-icon preset-filled-primary transform rounded-full
                                           transition-transform duration-200 ease-out
                                           active:scale-100"
                >
                  <Search size={18} class="transition-transform duration-200" />
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
    {#if pageError}
      <div
        class="flex flex-col items-center justify-center rounded-md border border-red-500 bg-red-50 p-8 text-center text-red-700"
      >
        <ServerCrash size={48} class="mb-6 opacity-75" />
        <p class="mb-2 text-xl font-semibold">
          {#if page.status === 503}
            Search Service Error
          {:else if page.status >= 500}
            Server Error
          {:else if page.status >= 400}
            Input Error
          {:else}
            Error
          {/if}
          ({page.status})
        </p>
        <p class="text-sm">{pageError.message}</p>
        <a href="/" class="btn preset-outline-primary mt-6">Go to Homepage</a>
      </div>
    {:else if data?.searchQuery || currentSearchQuery}
      <div
        class="border-surface-200-800 flex flex-col items-center justify-between gap-2 border-b pb-4 md:flex-row md:flex-wrap"
      >
        <div class="flex items-center gap-2">
          <label
            for="sort-order-select"
            class="text-surface-800-200 text-sm whitespace-nowrap"
            hidden
          >
            Sort&nbsp;by:
          </label>
          <select
            id="sort-order-select"
            value={serverSortOrder}
            onchange={handleFilterChange}
            class="select select-sm preset-filled-surface-200-800 focus:ring-primary-500 border-surface-300-700 hover:border-primary-500/50 rounded-md py-1.5 shadow-sm transition-colors"
            aria-label="Sort order"
          >
            {#each sortOptions as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label for="start-year-select" class="text-surface-800-200 text-sm whitespace-nowrap">
            From:
          </label>
          <select
            id="start-year-select"
            value={currentStartYear}
            onchange={handleFilterChange}
            class="select select-sm preset-filled-surface-200-800 focus:ring-primary-500 border-surface-300-700 hover:border-primary-500/50 rounded-md py-1.5 shadow-sm transition-colors"
            aria-label="Start year for search filter"
          >
            <option value="">All time</option>
            {#each startYearOptions as year (year)}
              {#if year}
                <option value={year}>{year}</option>
              {/if}
            {/each}
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label for="end-year-select" class="text-surface-800-200 text-sm whitespace-nowrap">
            To:
          </label>
          <select
            id="end-year-select"
            value={currentEndYear}
            onchange={handleFilterChange}
            class="select select-sm preset-filled-surface-200-800 focus:ring-primary-500 border-surface-300-700 hover:border-primary-500/50 rounded-md py-1.5 shadow-sm transition-colors"
            aria-label="End year for search filter"
          >
            <option value="">All time</option>
            {#each endYearOptions as year (year)}
              {#if year}
                <option value={year}>{year}</option>
              {/if}
            {/each}
          </select>
        </div>
        <div class="flex items-center gap-2">
          <a
            href="/trends?query={encodeURIComponent(currentSearchQuery)}"
            class="btn hover:bg-surface-100-900 ml-4 flex self-start whitespace-nowrap hover:shadow-md"
            aria-label="View trends for current search query"
          >
            View trends
            <SquareArrowOutUpRight size={18} />
          </a>
        </div>
      </div>

      {#await data.articles}
        <div class="flex flex-col items-center justify-center pt-16 text-center">
          <LoaderCircle size={48} class="text-primary-500 mb-6 animate-spin opacity-75" />
          <p class="text-surface-700-300 text-xl">Loading articles...</p>
        </div>
      {:then articles}
        {#if articles && articles.length > 0}
          <section class="space-y-2 pt-0">
            <div class="grid grid-cols-1 gap-6">
              {#each articles as article (article.id)}
                <ArticleResult {article} />
              {/each}
            </div>

            {#if articles.length === ARTICLES_PER_PAGE}
              <footer class="flex justify-center pt-8">
                <button
                  type="button"
                  class="btn preset-filled-primary hover:variant-soft-primary focus:variant-soft-primary"
                  onclick={handleNextPage}
                >
                  Next Page
                </button>
              </footer>
            {/if}
          </section>
        {:else}
          <div class="flex flex-col items-center justify-center pt-12 text-center">
            <Search size={48} class="text-surface-400-500 mb-6 opacity-75" />
            <p class="text-surface-700-300 mb-2 text-xl">
              No articles found for "{currentSearchQuery}"
              {#if currentStartYear || currentEndYear}
                <span class="text-surface-600-400 block text-base">
                  (between {currentStartYear || "start"} and {currentEndYear || "end"})
                </span>
              {/if}
            </p>
            {#if currentPage > 1}
              <p class="text-surface-500-400 mb-4 text-sm">
                You are on page {currentPage}.
              </p>
            {/if}
            <p class="text-surface-500-400 text-sm">
              Try refining your search, check for typos, or adjust the filters above.
            </p>
          </div>
        {/if}
      {:catch error}
        <div
          class="flex flex-col items-center justify-center rounded-md border border-red-500 bg-red-50 p-8 text-center text-red-700"
        >
          <AlertTriangle size={48} class="mb-6 opacity-75" />
          <p class="mb-2 text-xl font-semibold">Error Loading Articles</p>
          <p class="text-sm">
            {error.body?.message ||
              error.message ||
              "An unexpected error occurred while fetching articles."}
          </p>
          <button class="btn preset-outline-error mt-6" onclick={() => window.location.reload()}
            >Try Again</button
          >
        </div>
      {/await}
    {:else}
      <div class="flex h-full flex-col items-center justify-center pt-16 text-center">
        <Search size={64} class="text-surface-400-500 mb-4 opacity-50" />
        <p class="text-surface-500-400 text-lg">Enter a term to search the Felix archive.</p>
      </div>
    {/if}
  </main>
</div>
