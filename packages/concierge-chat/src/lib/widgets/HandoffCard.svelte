<script lang="ts">
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'handoff'>;
	export let threadId = '';
</script>

<div class="stack">
	<div class="row">
		<span class={`status-pill ${widget.data.tone}`}>{widget.data.queueName}</span>
		<strong>ETA {widget.data.eta}</strong>
	</div>

	<p>{widget.data.summary}</p>
	<div class="muted">Status: {widget.data.statusLabel}</div>

	<div class="chips">
		{#each widget.data.reasonCodes as code}
			<span class={`chip ${widget.data.tone}`}>{code}</span>
		{/each}
	</div>

	<a class="link-button" href={`/chat/${threadId}/handoff`}>{widget.data.actionLabel}</a>
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
		border-radius: 999px;
		font-size: 0.88rem;
	}

	.chip.danger {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.chip.good {
		background: var(--good-soft);
		color: var(--good);
	}

	.link-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: 999px;
		background: var(--button-bg);
		color: var(--button-ink);
		text-decoration: none;
		border: 1px solid rgba(167, 184, 255, 0.18);
		width: fit-content;
	}

	p {
		margin: 0;
	}
</style>
