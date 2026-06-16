<script lang="ts">
	import { runThreadAction } from '$chat/client-actions';
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'consent'>;
	export let threadId = '';

	let pending = false;
	let actionError = '';

	async function captureConsent() {
		pending = true;
		actionError = '';

		try {
			await runThreadAction(threadId, { type: 'capture_consent' });
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to capture consent right now.';
		} finally {
			pending = false;
		}
	}
</script>

<div class="stack">
	<span class={`status-pill ${widget.data.status === 'captured' ? 'good' : 'warn'}`}>
		{widget.data.status === 'captured' ? 'Consent captured' : 'Explicit consent required'}
	</span>
	<p>{widget.data.body}</p>
	<div class="policy">Policy: {widget.data.policyReference}</div>
	<button type="button" on:click={captureConsent} disabled={pending}>
		{pending ? 'Capturing...' : widget.data.confirmLabel}
	</button>
	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</div>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
	}

	.policy {
		font-size: 0.88rem;
		color: var(--muted);
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
