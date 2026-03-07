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
	}

	.summary-label {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.summary-value {
		margin-top: 0.35rem;
		font-size: clamp(1.25rem, 3vw, 1.95rem);
		line-height: 1.05;
		font-weight: 600;
		word-break: break-word;
	}

	.summary-note {
		margin-top: 0.45rem;
		font-size: 0.95rem;
		line-height: 1.45;
		color: var(--color-fg-muted);
	}
</style>
