<!-- /src/routes/+page.svelte -->
<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import { Pagination } from '@skeletonlabs/skeleton-svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { ARTICLES_PER_PAGE } from '$lib/config';
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import IconArrowLeft from '@lucide/svelte/icons/arrow-left';
	import IconArrowRight from '@lucide/svelte/icons/arrow-right';
	import IconEllipsis from '@lucide/svelte/icons/ellipsis';
	import IconFirst from '@lucide/svelte/icons/chevrons-left';
	import IconLast from '@lucide/svelte/icons/chevron-right';

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
		goto(`?${params.toString()}`, { keepFocus: true, invalidateAll: true });
	}
</script>

<div class="container mx-auto space-y-8 p-4 md:p-8">
	<header class="text-center">
		<a href="/">
			<h1 class="h1 text-secondary py-4">Felixplore</h1>
			<p>Uncover decades of student life, events and societies in the <em>Felix</em> archive.</p>
		</a>
	</header>

	<form method="POST" use:enhance class="mx-auto max-w-xl space-y-4 md:space-y-6">
		<label class="label">
			<span class="label-text sr-only font-semibold">Search the archive</span>
			<div
				class="input-group preset-filled-surface-50-950 focus-within:ring-primary-500 grid-cols-[auto_1fr_auto] rounded-full shadow-md transition-shadow duration-200 ease-in-out focus-within:shadow-lg focus-within:ring-1 hover:shadow-lg"
			>
				<div class="ig-cell text-surface-500-400 flex items-center justify-center pr-1 pl-4">
					<Search size={20} />
				</div>
				<input
					type="search"
					name="searchQuery"
					class="ig-input resize-none overflow-hidden border-none bg-transparent py-3 text-base leading-tight focus:ring-0 md:text-lg"
					placeholder="Search for events, people, topics..."
					bind:value={searchQuery}
					style="min-height: 2.5rem;"
				/>
				<div class="ig-cell flex items-center justify-center pr-3 pl-1">
					<button
						type="submit"
						title="Search"
						class="btn-icon preset-tonal-primary hover:preset-filled-primary text-primary-500 rounded-full p-1.5 md:p-2"
					>
						<Search size={20} />
					</button>
				</div>
			</div>
		</label>

		<button type="submit" class="btn preset-filled-primary sr-only"> Search </button>
	</form>

	{#if searchQuery && articles && articles.length > 0}
		<section class="space-y-6">
			<p>About {totalArticles} results</p>
			<div class="grid grid-cols-1 gap-6">
				{#each articles as article (article.publication + article.issue_no + article.page_no + article.headline)}
					<ArticleCard {article} />
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
		<p class="text-surface-600-300 text-center text-lg">
			No articles found matching your query "{searchQuery}".
		</p>
	{/if}
</div>
