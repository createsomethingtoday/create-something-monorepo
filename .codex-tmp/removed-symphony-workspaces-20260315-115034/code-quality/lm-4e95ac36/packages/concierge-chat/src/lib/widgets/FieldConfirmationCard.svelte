<script lang="ts">
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'field_confirmation'>;
</script>

<div class="stack">
	<p>{widget.data.description}</p>

	<div class="field-list">
		{#each widget.data.fields as field}
			<div class="field-row">
				<div>
					<strong>{field.label}</strong>
					<div class="value">{field.value}</div>
					{#if field.note}
						<div class="note">{field.note}</div>
					{/if}
				</div>
				<div class="meta">
					<span class="status-pill warn">{field.status}</span>
					<span>{Math.round(field.confidence * 100)}%</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="actions">
		<button disabled>{widget.data.confirmLabel}</button>
		<button class="ghost" disabled>{widget.data.rejectLabel}</button>
	</div>
</div>

<style>
	.stack {
		display: grid;
		gap: 1rem;
	}

	.field-list {
		display: grid;
		gap: 0.75rem;
	}

	.field-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.95rem 1rem;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.6);
		border: 1px solid rgba(31, 27, 22, 0.08);
	}

	.value {
		margin-top: 0.25rem;
	}

	.note {
		margin-top: 0.3rem;
		font-size: 0.9rem;
		color: var(--muted);
	}

	.meta {
		display: grid;
		align-content: start;
		justify-items: end;
		gap: 0.4rem;
		font-size: 0.88rem;
		color: var(--muted);
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.ghost {
		background: rgba(31, 27, 22, 0.08);
		color: var(--ink);
	}

	p {
		margin: 0;
	}
</style>
