<script lang="ts">
	import { runThreadAction } from '$chat/client-actions';
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'field_confirmation'>;
	export let threadId = '';

	$: fieldKeys = widget.data.fields.map((field) => field.key);

	let activeAction: 'confirm' | 'reject' | null = null;
	let actionError = '';

	async function submitAction(type: 'confirm_fields' | 'reject_fields', action: 'confirm' | 'reject') {
		activeAction = action;
		actionError = '';

		try {
			await runThreadAction(threadId, { type, fieldKeys });
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to update the profile fields.';
		} finally {
			activeAction = null;
		}
	}
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
		<button
			type="button"
			on:click={() => submitAction('confirm_fields', 'confirm')}
			disabled={activeAction !== null}
		>
			{activeAction === 'confirm' ? 'Confirming...' : widget.data.confirmLabel}
		</button>
		<button
			class="ghost"
			type="button"
			on:click={() => submitAction('reject_fields', 'reject')}
			disabled={activeAction !== null}
		>
			{activeAction === 'reject' ? 'Updating...' : widget.data.rejectLabel}
		</button>
	</div>

	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
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
		background: var(--surface-soft);
		border: 1px solid var(--line);
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
		background: var(--surface-overlay);
		color: var(--ink);
		border: 1px solid var(--line);
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
