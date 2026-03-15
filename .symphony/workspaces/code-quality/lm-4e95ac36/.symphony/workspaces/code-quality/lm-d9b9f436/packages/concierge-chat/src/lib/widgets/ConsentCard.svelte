<script lang="ts">
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'consent'>;
</script>

<div class="stack">
	<span class={`status-pill ${widget.data.status === 'captured' ? 'good' : 'warn'}`}>
		{widget.data.status === 'captured' ? 'Consent captured' : 'Explicit consent required'}
	</span>
	<p>{widget.data.body}</p>
	<div class="policy">Policy: {widget.data.policyReference}</div>
	<button disabled>{widget.data.confirmLabel}</button>
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
</style>
