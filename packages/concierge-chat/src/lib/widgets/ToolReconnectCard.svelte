<script lang="ts">
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'tool_reconnect'>;
</script>

<div class="stack">
	<span class={`status-pill ${widget.data.status === 'connected' ? 'good' : 'warn'}`}>
		{widget.data.toolName}
	</span>
	<p>{widget.data.reason}</p>
	<a class="link-button" href={widget.data.connectHref}>{widget.data.reconnectLabel}</a>
</div>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
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
