<script lang="ts">
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'handoff'>;
</script>

<div class="stack">
	<div class="row">
		<span class="status-pill danger">{widget.data.queueName}</span>
		<strong>ETA {widget.data.eta}</strong>
	</div>

	<p>{widget.data.summary}</p>

	<div class="chips">
		{#each widget.data.reasonCodes as code}
			<span class="chip">{code}</span>
		{/each}
	</div>

	<a class="link-button" href="./handoff">{widget.data.actionLabel}</a>
</div>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		padding: 0.4rem 0.65rem;
		border-radius: var(--radius-tight);
		background: rgba(162, 61, 53, 0.12);
		color: var(--danger);
		font-size: 0.88rem;
	}

	.link-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: var(--radius-tight);
		background: var(--ink);
		color: white;
		text-decoration: none;
		width: fit-content;
	}

	p {
		margin: 0;
	}
</style>
