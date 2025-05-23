<!-- /src/routes/article/[id]/+page.svelte -->
<script lang="ts">
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import ArticleDisplay from '$lib/components/ArticleDisplay.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="container mx-auto p-4 md:p-8">
	<header class="text-left">
		<a href="/">
			<h3 class="h3 text-secondary-400-600 py-4">Felixplore</h3>
		</a>
		<hr class="opacity-20 mb-8" />
	</header>
	<div class="flex flex-col lg:flex-row gap-8">
		<main class="lg:w-2/3">
			{#if data.article}
				<ArticleDisplay article={data.article} />
			{:else}
				<div class="text-center">
					<p class="text-xl text-error-500">Article could not be loaded.</p>
				</div>
			{/if}
		</main>

		{#if data.recommendedArticles && data.recommendedArticles.length > 0}
			<aside class="lg:w-1/3 space-y-6">
				<h3 class="h6 mb-4">More like this</h3>
				{#each data.recommendedArticles as recommendedArticle (recommendedArticle.id)}
					<ArticleCard article={recommendedArticle} />
				{/each}
			</aside>
		{/if}
	</div>
</div>