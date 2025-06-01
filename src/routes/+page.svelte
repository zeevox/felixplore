<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import Dices from "@lucide/svelte/icons/dices";
  import TrendingUp from "@lucide/svelte/icons/trending-up";

  let searchQuery = $state("");
</script>

<div
  class="container mx-auto my-8 flex min-h-dvh flex-col items-center justify-start p-4 text-center transition-colors duration-500 ease-in-out sm:my-0 sm:justify-center"
>
  <header class="mb-10">
    <a href="/" class="group">
      <h1
        class="text-secondary-500 dark:text-secondary-50
				p-4
				 text-5xl font-extrabold tracking-tight transition-opacity
				duration-300 group-hover:opacity-80 sm:text-7xl"
      >
        Felixplore
      </h1>
    </a>
  </header>

  <div class="w-full max-w-2xl">
    <form action="/search" method="GET" class="mb-8">
      <label class="label w-full">
        <span class="sr-only">Search the archive</span>
        <div
          class="input-group focus-within:ring-primary-500/70 mx-2
                           transform grid-cols-[1fr_auto] rounded-full
                           bg-white/70 p-2 shadow-md
                           backdrop-blur-lg transition-all
                           duration-300 ease-out focus-within:scale-[1.02]
                           focus-within:ring-2 hover:scale-[1.02] hover:shadow-2xl dark:bg-black/50"
        >
          <input
            type="search"
            name="query"
            bind:value={searchQuery}
            class="ig-input text-surface-900 dark:text-surface-100 placeholder:text-surface-500 dark:placeholder:text-surface-400
                               resize-none truncate overflow-hidden border-none bg-transparent
                                px-3 text-base leading-tight
                               placeholder:truncate focus:ring-0 md:text-lg"
            placeholder="Search for events, people, societies..."
            style="min-height: 2.5rem;"
          />
          <div class="ig-cell flex items-center justify-center px-2">
            <button
              type="submit"
              title="Search"
              class="btn-icon preset-filled-primary transform rounded-full
                                   transition-transform duration-200 ease-out
                                   active:scale-100"
            >
              <Search size={24} class="transition-transform duration-200" />
            </button>
          </div>
        </div>
      </label>
    </form>

    <div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <a
        href="/random"
        class="btn preset-outlined-secondary-800-200 bg-surface-50-950
	                       hover:shadow-secondary-500/30 w-auto
	                       transform rounded-full
	                       border-2 py-3
	                       text-base font-semibold
	                       shadow-lg transition-all duration-200 ease-out hover:scale-102 active:scale-96
	                       sm:px-10"
        aria-label="Find a random article"
      >
        <Dices class="mr-2 inline-block" size={20} />
        I'm feeling lucky
      </a>
      <a
        href="/trends"
        class="btn preset-outlined-secondary-800-200 bg-surface-50-950
	                       hover:shadow-secondary-500/30 w-auto
	                       transform rounded-full
	                       border-2 py-3
	                       text-base font-semibold
	                       shadow-lg transition-all duration-200 ease-out hover:scale-102 active:scale-96
	                       sm:px-10"
        aria-label="Explore trends"
      >
        <TrendingUp class="mr-2 inline-block" size={20} />
        Trends
      </a>
    </div>
  </div>
</div>
