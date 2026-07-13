<script lang="ts">
	export let label = '';
	export let value = '';
	export let note = '';
</script>

<div class="summary-item">
	<div class="summary-label">{label}</div>
	<div class="summary-value">{value}</div>
	{#if note}
		<div class="summary-note">{note}</div>
	{/if}
</div>

<style>
	.summary-item {
		min-width: 0;
		padding: 0.75rem 0.9rem 0.75rem 0;
		border-right: 1px solid rgba(255, 255, 255, 0.08);
	}

	.summary-label {
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	.summary-value {
		margin-top: 0.32rem;
		font-size: clamp(1rem, 2.1vw, 1.35rem);
		line-height: 1.15;
		font-weight: 560;
		word-break: break-word;
		font-variant-numeric: tabular-nums;
	}

	.summary-note {
		margin-top: 0.35rem;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-performance-fg-muted);
	}

	@media (max-width: 900px) {
		.summary-item {
			padding-right: 0;
			border-right: 0;
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		}
	}
</style>
