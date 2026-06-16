<script lang="ts">
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'document_upload'>;
</script>

<div class="stack">
	<p>{widget.data.description}</p>

	<div class="chips">
		{#each widget.data.requestedDocuments as item}
			<span class="chip">{item}</span>
		{/each}
	</div>

	<div class="meta">Accepted types: {widget.data.acceptedTypes.join(', ')}</div>
	<button disabled>{widget.data.uploadLabel}</button>
</div>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		padding: 0.45rem 0.7rem;
		border-radius: var(--radius-tight);
		background: rgba(31, 27, 22, 0.08);
		font-size: 0.9rem;
	}

	.meta {
		color: var(--muted);
		font-size: 0.9rem;
	}

	p {
		margin: 0;
	}
</style>
