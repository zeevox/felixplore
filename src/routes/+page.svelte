<script lang="ts">
    import Search from '@lucide/svelte/icons/search';
    let searchQuery = '';
</script>

<div class="container mx-auto flex h-full flex-col items-center justify-center p-4 text-center">
    <header class="mb-10">
        <a href="/">
            <h1 class="text-6xl font-bold text-primary-500 md:text-7xl">Felixplore</h1>
        </a>
    </header>

    <div class="w-full max-w-xl">
        <form action="/search" method="GET" class="mb-6">
            <label class="label w-full">
                <span class="label-text sr-only">Search the archive</span>
                <div
                    class="input-group preset-filled-surface-50-950 focus-within:ring-primary-500 grid-cols-[1fr_auto] rounded-full shadow-lg transition-shadow duration-200 ease-in-out focus-within:shadow-xl focus-within:ring-2 hover:shadow-xl"
                >
                    <input
                        type="search"
                        name="query"
                        bind:value={searchQuery}
                        class="ig-input resize-none overflow-hidden border-none bg-transparent py-3.5 pl-6 pr-3 text-base leading-tight focus:ring-0 md:text-lg"
                        placeholder="Search for events, people, topics..."
                        style="min-height: 3rem;"
                    />
                    <div class="ig-cell flex items-center justify-center pr-3">
                        <button
                            type="submit"
                            title="Search"
                            class="btn-icon preset-tonal-primary hover:preset-filled-primary text-primary-500 rounded-full p-2 md:p-2.5"
                        >
                            <Search size={22} />
                        </button>
                    </div>
                </div>
            </label>
        </form>

    </div>
</div>

<style>
    /* Optional: Ensure full height for vertical centering if not already handled by a layout */
    :global(body), :global(html) {
        height: 100%;
    }
    /* Ensure the direct parent of this page can also take full height if needed */
    :global(#svelte-announcer + div) {
         height: 100%;
    }
</style>