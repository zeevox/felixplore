<script lang="ts">
	import { Chart, registerables } from 'chart.js';
	import { onDestroy } from 'svelte';

	Chart.register(...registerables);

	let { data } = $props();

	let chartCanvas = $state<HTMLCanvasElement>();
	let chartInstance: Chart | null = null;

	function createChart(chartData: { year: number; popularity: number }[]) {
		if (chartInstance) {
			chartInstance.destroy();
		}

		const labels = chartData.map((d) => d.year.toString());
		const popularities = chartData.map((d) => d.popularity);

		chartInstance = new Chart(chartCanvas!, {
			type: 'line',
			data: {
				labels: labels,
				datasets: [
					{
						label: 'Prevalence',
						data: popularities,
						fill: false,
						tension: 0.1,
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						title: {
							display: true,
							text: 'Prevalence'
						}
					},
					x: {
						title: {
							display: true,
							text: 'Year'
						}
					}
				},
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						mode: 'index',
						intersect: false,
						callbacks: {
							label: function (context) {
								let label = context.dataset.label || '';
								if (label) {
									label += ': ';
								}
								if (context.parsed.y !== null) {
									// Format to a reasonable number of decimal places
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
		if (data.trendData && chartCanvas) {
			createChart(data.trendData);
		} else if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}
	});

	onDestroy(() => {
		if (chartInstance) {
			chartInstance.destroy();
		}
	});
</script>

<div class="container mx-auto p-4">
	{#if data.query}
		<h1 class="h1 mb-4">
			Trend for <span class="text-primary-500 font-semibold">{data.query}</span>
		</h1>
	{/if}

	{#if data.error}
		<div class="alert variant-filled-error rounded-md p-4">
			<h4 class="font-bold">Error</h4>
			<p>{data.error}</p>
		</div>
	{:else if data.trendData && data.trendData.length > 0}
		<div class="card rounded-md p-4 shadow-lg" style="height: 500px;">
			<canvas bind:this={chartCanvas}></canvas>
		</div>
	{:else if data.query && (!data.trendData || data.trendData.length === 0)}
		<div class="alert variant-filled-warning rounded-md p-4">
			<p>
				No data found for the query "{data.query}". The concept might not be prevalent in
				the archive or the embedding model could not find strong matches.
			</p>
		</div>
	{:else if !data.query && !data.error}
		<div class="p-8 text-center">
			<p class="text-gray-500">Enter a query to see its trend over time.</p>
		</div>
	{/if}
</div>
