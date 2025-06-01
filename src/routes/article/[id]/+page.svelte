<!-- /src/routes/article/[id]/+page.svelte -->
<script lang="ts">
  import ArticleCard from "$lib/components/ArticleCard.svelte";
  import ArticleDisplay from "$lib/components/ArticleDisplay.svelte";
  import Search from "@lucide/svelte/icons/search";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<div class="container mx-auto p-4 md:p-8">
  <header
    class="border-b-surface-contrast-100-900/75 my-4 mb-8 flex flex-row items-center justify-between border-b pb-2"
  >
    <a href="/" class="hover:text-primary-500 self-center text-2xl font-semibold transition-colors">
      Felixplore
    </a>
    <a href="/search">
      <Search size={24} class="mr-2" />
    </a>
  </header>
  <div class="flex flex-col gap-16 lg:flex-row">
    <main class="lg:w-2/3">
      {#if data.article}
        <ArticleDisplay article={data.article} />
      {:else}
        <div class="text-center">
          <p class="text-error-500 text-xl">Article could not be loaded.</p>
        </div>
      {/if}
    </main>

    {#if data.recommendedArticles && data.recommendedArticles.length > 0}
      <aside class="space-y-6 lg:w-1/3">
        <h3 class="h6 mb-4">More like this</h3>
        {#each data.recommendedArticles as recommendedArticle (recommendedArticle.id)}
          <ArticleCard article={recommendedArticle} />
        {/each}
      </aside>
    {/if}
  </div>
</div>
