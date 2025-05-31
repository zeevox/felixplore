<script lang="ts">
  import type { Article } from "$lib/types/article";
  import dayjs from "dayjs";

  let { article }: { article: Article } = $props();

  function formatDate(date: Date): string {
    return dayjs(date).format("MMM YYYY");
  }

  function truncateText(text: string, maxLength: number = 120): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, text.lastIndexOf(" ", maxLength)) + "...";
  }

  const displayText = $derived(article.strapline || truncateText(article.txt));
</script>

<a
  href={`/article/${article.id}`}
  class="card group preset-filled-surface-50-950 focus-visible:outline-primary-500 focus-visible:ring-primary-500 block overflow-hidden rounded-lg shadow-sm transition-all duration-300 ease-in-out hover:shadow-lg focus-visible:ring-2"
>
  <div class="p-5">
    {#if article.category}
      <p
        class="h6 text-primary-500 group-hover:text-primary-600 mb-1 text-xs font-semibold tracking-wide uppercase transition-colors duration-300"
      >
        {article.category}
      </p>
    {/if}
    {#if article.headline}
      <h3 class="h4 group-hover:text-primary-500 mb-2 text-ellipsis transition-colors duration-300">
        {article.headline}
      </h3>
    {/if}
    <p class="text-surface-contrast-200-800 mb-3 text-sm opacity-90">
      {displayText}
    </p>
    <div class="text-surface-500-500 dark:text-surface-500-500 text-xs">
      <span><span class="capitalize">{article.publication}</span> #{article.issue_no}</span>
      <span class="mx-1.5" aria-hidden="true">&bull;</span>
      <span>{formatDate(article.article_date)}</span>
    </div>
  </div>
</a>
