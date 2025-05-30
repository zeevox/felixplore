<script lang="ts">
    import { Chart, registerables } from "chart.js";
    import { onDestroy } from "svelte";
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation"; // Import goto
    import Search from "@lucide/svelte/icons/search";

    Chart.register(...registerables);

    let { data } = $props<{
        query: string | null;
        trendData: { year: number; popularity: number }[] | null;
        error: string | null;
        currentTau: number;
    }>();

    let formQuery = $state(data.query ?? "");
    let formTau = $state(data.currentTau.toString());

    let chartCanvas = $state<HTMLCanvasElement>();
    let chartInstance: Chart | null = null;

    function createChart(chartData: { year: number; popularity: number }[]) {
        if (chartInstance) {
            chartInstance.destroy();
        }
        if (!chartCanvas) return;

        const labels = chartData.map((d) => d.year.toString());
        const popularities = chartData.map((d) => d.popularity);

        // Attempt to get the primary color from CSS variables for modern theming
        // Fallback to a default vibrant color if CSS variable is not found or in a non-browser environment

        const primaryColor = getComputedStyle(document.documentElement)
            .getPropertyValue("--color-secondary-400")
            .trim();

        chartInstance = new Chart(chartCanvas, {
            type: "bar", // Changed from "line" to "bar"
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Prevalence",
                        data: popularities,
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                        borderWidth: 1,
                        hoverBackgroundColor: primaryColor
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                    if (elements.length > 0 && data.query) {
                        const chartElement = elements[0];
                        const index = chartElement.index;
                        const year = labels[index]; // Year is a string here

                        const searchParams = new URLSearchParams();
                        searchParams.set("query", data.query);
                        searchParams.set("startYear", year);
                        searchParams.set("endYear", year);

                        goto(`/search?${searchParams.toString()}`);
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: "Prevalence"
                        },
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                const numValue =
                                    typeof value === "string" ? parseFloat(value) : value;
                                return numValue.toFixed(3);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Year"
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: "index",
                        intersect: false,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || "";
                                if (label) {
                                    label += ": ";
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(4);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    $effect(() => {
        formQuery = data.query ?? "";
        formTau = data.currentTau.toString();
    });

    $effect(() => {
        if (data.trendData && data.trendData.length > 0 && chartCanvas && data.query) {
            createChart(data.trendData);
        } else if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
            const ctx = chartCanvas?.getContext("2d");
            if (ctx && chartCanvas) {
                ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
            }
        }
    });

    onDestroy(() => {
        if (chartInstance) {
            chartInstance.destroy();
        }
    });
</script>

<svelte:head>
    <title>Trend Analysis {data.query ? `- ${data.query}` : ""}</title>
    {#if data.query}
        <meta
            name="description"
            content="Trend analysis for {data.query} in the Felixplore archive."
        />
    {/if}
</svelte:head>

<div class="bg-surface-50-950 text-surface-900-50 flex min-h-screen flex-col">
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
                <input type="hidden" name="tau" bind:value={formTau} />
                <label class="w-full">
                    <span class="sr-only">Analyse trend for a term</span>
                    <div
                        class="input-group focus-within:ring-primary-500/70 grid transform grid-cols-[1fr_auto]
                               rounded-full bg-white/70 p-2 shadow-md
                               backdrop-blur-lg transition-all
                               duration-300 ease-out focus-within:ring-2 hover:shadow-lg dark:bg-black/50"
                    >
                        <input
                            type="search"
                            name="query"
                            bind:value={formQuery}
                            class="ig-input text-surface-900 dark:text-surface-100
                                   placeholder:text-surface-500 dark:placeholder:text-surface-400
                                   resize-none truncate overflow-hidden border-none bg-transparent
                                   px-3 text-sm leading-tight
                                   focus:ring-0 md:text-base"
                            placeholder="Analyse trend for..."
                            style="min-height: 2.25rem;"
                            aria-label="Analyse trend for a term"
                        />
                        {#if formQuery.trim()}
                            <div class="ig-cell flex items-center justify-center px-2">
                                <button
                                    type="submit"
                                    title="Analyse Trend"
                                    aria-label="Submit trend analysis"
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
                <button type="submit" class="btn preset-filled-primary sr-only">Analyse</button>
            </form>
        </div>
    </header>

    <main class="container mx-auto flex-grow space-y-8 p-4 md:p-8">
        {#if data.query && !data.error}
            <h1 class="h1 mb-2 text-2xl md:text-3xl">
                Trend for <span class="text-primary-500 font-semibold">{data.query}</span>
            </h1>
        {/if}

        {#if data.error}
            <div class="alert variant-filled-error rounded-md p-4">
                <h4 class="font-bold">Error Analyzing Trend</h4>
                <p>{data.error}</p>
            </div>
        {:else if data.trendData && data.trendData.length > 0 && data.query}
            <div class="card rounded-md p-4 shadow-lg" style="height: 500px;">
                <canvas bind:this={chartCanvas}></canvas>
            </div>
        {:else if data.query && (!data.trendData || data.trendData.length === 0)}
            <div class="alert variant-outline-surface rounded-md p-6 text-center">
                <Search size={48} class="text-surface-400-500 mb-4 inline-block opacity-75" />
                <p class="text-surface-700-300 text-lg">
                    No trend data found for "<span class="font-semibold">{data.query}</span>".
                </p>
                <p class="text-surface-600-400 mt-1 text-sm">
                    This concept might not be prevalent enough in the archive, or the embedding
                    model may not have found strong matches.
                </p>
            </div>
        {:else if !data.query && !data.error}
            <div class="flex h-full flex-col items-center justify-center pt-16 text-center">
                <Search size={64} class="text-surface-400-500 mb-4 opacity-50" />
                <p class="text-surface-500-400 text-lg">
                    Enter a term in the search bar above to analyse its trend over time.
                </p>
            </div>
        {/if}

        {#if data.query && !data.error}
            <div class="text-surface-500-400 mt-4 text-center text-xs">
                Using similarity threshold of {data.currentTau.toFixed(2)}
            </div>
        {/if}
    </main>
</div>
