<script lang="ts">
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'profile_progress'>;
</script>

<div class="stack">
	<div class="row">
		<strong>{widget.data.completion}% complete</strong>
		<span class="status-pill good">{widget.data.confirmedCount} confirmed</span>
	</div>

	<div class="meter" aria-hidden="true">
		<div class="fill" style={`width: ${widget.data.completion}%`}></div>
	</div>

	<div class="meta">
		<span>{widget.data.inferredCount} inferred</span>
		<span>{widget.data.missingFields.length} remaining blockers</span>
	</div>

	<p>{widget.data.nextPrompt}</p>

	<ul>
		{#each widget.data.missingFields as field}
			<li>{field}</li>
		{/each}
	</ul>
</div>

<style>
	.stack {
		display: grid;
		gap: 0.85rem;
	}

	.row,
	.meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.meta {
		color: var(--muted);
		font-size: 0.92rem;
	}

	.meter {
		height: 0.7rem;
		border-radius: var(--radius-tight);
		background: rgba(31, 27, 22, 0.08);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--accent), #d69157);
	}

	ul {
		margin: 0;
		padding-left: 1.1rem;
		color: var(--muted);
	}

	p {
		margin: 0;
	}
</style>
