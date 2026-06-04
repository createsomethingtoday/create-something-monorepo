<script lang="ts">
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'profile_progress'>;
	export let threadId = '';
</script>

<div class="stack" data-thread-id={threadId}>
	<div class="row">
		<strong>{widget.data.completion}% complete</strong>
		<span class="status-pill good">{widget.data.confirmedCount} captured</span>
	</div>

	<div class="meter" aria-hidden="true">
		<div class="fill" style={`width: ${widget.data.completion}%`}></div>
	</div>

	<div class="meta">
		<span>{widget.data.inferredCount} inferred detail{widget.data.inferredCount === 1 ? '' : 's'}</span>
		<span>{widget.data.missingFields.length} next step{widget.data.missingFields.length === 1 ? '' : 's'}</span>
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
		gap: 1rem;
	}

	.row,
	.meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.row strong {
		font-size: 1.02rem;
		letter-spacing: -0.02em;
	}

	.meta {
		color: var(--muted);
		font-size: 0.88rem;
	}

	.meter {
		height: 0.7rem;
		border-radius: 999px;
		background: var(--surface-overlay);
		border: 1px solid rgba(167, 184, 255, 0.08);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: inherit;
		background: var(--accent-gradient);
	}

	ul {
		margin: 0;
		padding-left: 1.1rem;
		color: var(--muted);
		display: grid;
		gap: 0.35rem;
	}

	p {
		margin: 0;
		color: var(--muted-strong);
		line-height: 1.55;
	}
</style>
