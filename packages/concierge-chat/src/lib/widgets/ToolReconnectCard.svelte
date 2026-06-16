<script lang="ts">
	import { runThreadAction } from '$chat/client-actions';
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'tool_reconnect'>;
	export let threadId = '';

	let pending = false;
	let actionError = '';

	async function reconnectTool() {
		pending = true;
		actionError = '';

		try {
			await runThreadAction(threadId, { type: 'resolve_reconnect' });
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to resolve the reconnect hold.';
		} finally {
			pending = false;
		}
	}
</script>

<div class="stack">
	<span class={`status-pill ${widget.data.status === 'connected' ? 'good' : 'warn'}`}>
		{widget.data.toolName}
	</span>
	<p>{widget.data.reason}</p>
	<p class="muted detail">
		Use `.agency` for the actual reconnect flow. Use the action below only after recovery is
		complete.
	</p>
	<div class="actions">
		<a class="control-plane-link" href={widget.data.connectHref} target="_blank" rel="noreferrer">
			Open in .agency
		</a>
		<button class="link-button" type="button" on:click={reconnectTool} disabled={pending}>
			{pending ? 'Reconnecting...' : widget.data.reconnectLabel}
		</button>
	</div>
	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</div>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.link-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: 999px;
		background: var(--button-bg);
		color: var(--button-ink);
		border: 1px solid rgba(167, 184, 255, 0.18);
		width: fit-content;
	}

	.control-plane-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--surface-overlay);
		color: var(--ink);
		text-decoration: none;
		font-weight: 600;
	}

	.detail {
		font-size: 0.92rem;
	}

	p {
		margin: 0;
	}

	.error-text {
		margin: 0;
		color: var(--danger);
		font-size: 0.92rem;
	}
</style>
