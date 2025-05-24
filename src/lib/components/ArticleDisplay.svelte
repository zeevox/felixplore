<script lang="ts">
	import type { Article } from '$lib/types/article';
	import SquareArrowOutUpRight from '@lucide/svelte/icons/square-arrow-out-up-right';
	import dayjs from 'dayjs'; // Import dayjs
	import advancedFormat from 'dayjs/plugin/advancedFormat'; // For 'LL' or similar formats
	dayjs.extend(advancedFormat);

	export let article: Article;

	function formatDate(date: Date): string {
		return dayjs(date).format('Do MMMM YYYY');
	}
</script>

<article class="space-y-6">
	<header class="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex-1 space-y-4">
			{#if article.category}
				<div>
					<span class="uppercase h6 text-primary-500">{article.category}</span>
				</div>
			{/if}

			<h1 class="h2">{article.headline}</h1>

			{#if article.strapline}
				<p class="text-surface-600-300 text-lg opacity-90">
					{article.strapline}
				</p>
			{/if}

			{#if article.author}
				<p class="text-md text-surface-600-300">
					By <a class="font-semibold" href="/?query={encodeURIComponent(article.author)}">
						{article.author}
					</a>
				</p>
			{/if}

			<p class="text-surface-500-400 text-sm">{formatDate(article.article_date)}</p>
		</div>
		<a
			class="btn hover:bg-surface-100-900 ml-4 hidden self-start hover:shadow-md xl:flex"
			target="_blank"
			rel="noopener noreferrer"
			href="https://issues.felixonline.co.uk/{article.publication}_{article.issue_no}.pdf#page={article.page_no}"
			aria-label="View original"
		>
			View original
			<SquareArrowOutUpRight size={18} />
		</a>
	</header>

	<section class="prose-lg max-w-none space-y-4 opacity-95">
		{#each article.txt.split('\n\n') as paragraph}
			<p>{paragraph}</p>
		{/each}
	</section>

	<footer class="text-s opacity-70">
		<span>
			Published in
			<a
				target="_blank"
				rel="noopener noreferrer"
				href="https://issues.felixonline.co.uk/{article.publication}_{article.issue_no}.pdf#page={article.page_no}"
			>
				<em class="capitalize">{article.publication}</em> Issue #{article.issue_no}, page {article.page_no}
			</a>
		</span>
	</footer>
</article>
