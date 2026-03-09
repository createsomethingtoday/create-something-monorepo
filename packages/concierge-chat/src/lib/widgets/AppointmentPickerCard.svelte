<script lang="ts">
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'appointment_picker'>;
</script>

<div class="stack">
	<p>{widget.data.description}</p>

	<div class="slot-list">
		{#each widget.data.slots as slot}
			<div class="slot-row">
				<div>
					<strong>{slot.label}</strong>
					<div class="window">{slot.window}</div>
				</div>
				<span class={`status-pill ${slot.availability === 'open' ? 'good' : 'warn'}`}>
					{slot.availability}
				</span>
			</div>
		{/each}
	</div>

	<button disabled>{widget.data.confirmLabel}</button>
</div>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
	}

	.slot-list {
		display: grid;
		gap: 0.75rem;
	}

	.slot-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
		padding: 0.95rem 1rem;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.6);
		border: 1px solid rgba(31, 27, 22, 0.08);
	}

	.window {
		margin-top: 0.2rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	p {
		margin: 0;
	}
</style>
