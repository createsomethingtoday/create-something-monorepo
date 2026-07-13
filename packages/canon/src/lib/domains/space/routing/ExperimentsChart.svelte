<script lang="ts">
	interface Props {
		experiments: Array<{
			id: string;
			timestamp: number;
			taskId: string;
			description: string;
			modelUsed: 'haiku' | 'sonnet' | 'opus';
			routingStrategy: string;
			routingConfidence: number;
			success: boolean;
			cost: number;
			notes: string;
		}>;
	}

	let { experiments }: Props = $props();

	// Group by model
	const byModel = $derived(() => {
		const groups = { haiku: 0, sonnet: 0, opus: 0 };
		experiments.forEach(exp => {
			groups[exp.modelUsed]++;
		});
		return groups;
	});

	// Calculate success rates
	const successRates = $derived(() => {
		const rates: Record<string, { total: number; success: number }> = {
			haiku: { total: 0, success: 0 },
			sonnet: { total: 0, success: 0 },
			opus: { total: 0, success: 0 }
		};

		experiments.forEach(exp => {
			rates[exp.modelUsed].total++;
			if (exp.success) rates[exp.modelUsed].success++;
		});

		return {
			haiku: rates.haiku.total > 0 ? (rates.haiku.success / rates.haiku.total) * 100 : 0,
			sonnet: rates.sonnet.total > 0 ? (rates.sonnet.success / rates.sonnet.total) * 100 : 0,
			opus: rates.opus.total > 0 ? (rates.opus.success / rates.opus.total) * 100 : 0
		};
	});

	// Calculate total cost and savings
	const costAnalysis = $derived(() => {
		const totalCost = experiments.reduce((sum, exp) => sum + exp.cost, 0);
		const ifAllSonnet = experiments.length * 0.01;
		const savings = ifAllSonnet - totalCost;
		const savingsPercent = ifAllSonnet > 0 ? (savings / ifAllSonnet) * 100 : 0;

		return { totalCost, ifAllSonnet, savings, savingsPercent };
	});
</script>

<div class="experiments-chart">
	<div class="stat-grid">
		<div class="stat-card">
			<h3 class="stat-label">Total Experiments</h3>
			<div class="stat-value">{experiments.length}</div>
		</div>

		<div class="stat-card">
			<h3 class="stat-label">Haiku Tasks</h3>
			<div class="stat-value haiku">{byModel().haiku}</div>
			<div class="stat-detail">{successRates().haiku.toFixed(0)}% success</div>
		</div>

		<div class="stat-card">
			<h3 class="stat-label">Sonnet Tasks</h3>
			<div class="stat-value sonnet">{byModel().sonnet}</div>
			<div class="stat-detail">{successRates().sonnet.toFixed(0)}% success</div>
		</div>

		<div class="stat-card">
			<h3 class="stat-label">Opus Tasks</h3>
			<div class="stat-value opus">{byModel().opus}</div>
			<div class="stat-detail">{successRates().opus > 0 ? successRates().opus.toFixed(0) : 0}% success</div>
		</div>

		<div class="stat-card highlight">
			<h3 class="stat-label">Cost Savings</h3>
			<div class="stat-value">${costAnalysis().savings.toFixed(3)}</div>
			<div class="stat-detail">{costAnalysis().savingsPercent.toFixed(1)}% vs all Sonnet</div>
		</div>

		<div class="stat-card">
			<h3 class="stat-label">Total Cost</h3>
			<div class="stat-value">${costAnalysis().totalCost.toFixed(3)}</div>
			<div class="stat-detail">Actual spend</div>
		</div>
	</div>
</div>

<style>
	.experiments-chart {
		padding: var(--space-performance-lg);
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-performance-md);
	}

	.stat-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-md);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.stat-card:hover {
		border-color: var(--color-performance-border-emphasis);
		transform: scale(var(--scale-performance-micro));
	}

	.stat-card.highlight {
		border-color: var(--color-performance-success-border);
		background: var(--color-performance-success-muted);
	}

	.stat-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin: 0 0 var(--space-performance-sm) 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: var(--text-performance-h2);
		color: var(--color-performance-fg-primary);
		font-weight: 700;
		margin: 0;
	}

	.stat-value.haiku {
		color: var(--color-performance-data-1);
	}

	.stat-value.sonnet {
		color: var(--color-performance-data-3);
	}

	.stat-value.opus {
		color: var(--color-performance-data-4);
	}

	.stat-detail {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin-top: var(--space-performance-xs);
	}
</style>
