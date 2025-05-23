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
						label: 'avg(ts_rank)',
						data: popularities,
						fill: false,
						tension: 0.1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: 'Average normalised article rank'
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
						intersect: false
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
		<h1 class="h1 mb-4">Trend for <span class="text-secondary-400-600">{data.query}</span></h1>
	{/if}

	{#if data.error}
		<div class="alert variant-filled-error">
			<p>{data.error}</p>
		</div>
	{:else if data.trendData && data.trendData.length > 0}
		<div class="card p-4" style="height: 500px;">
			<canvas bind:this={chartCanvas}></canvas>
		</div>
	{:else if data.query && !data.trendData?.length}
		<div class="alert variant-filled-warning">
			<p>No data found for the query "{data.query}".</p>
		</div>
	{:else if !data.query && !data.error}{/if}
</div>
