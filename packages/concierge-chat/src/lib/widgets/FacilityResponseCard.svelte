<script lang="ts">
	import type { AgencyGovernedActionGate } from '$lib/agency-access';
	import { runThreadAction } from '$chat/client-actions';
	import { buildControlPlaneBridgeHref } from '$lib/control-plane';
	import type { WidgetOf } from './types';

	export let widget: WidgetOf<'facility_response'>;
	export let threadId = '';
	export let governedActionGate: AgencyGovernedActionGate | null = null;
	export let intakeProtectedActionsBlocked = false;
	export let intakeProtectionMessage = '';

	let pendingActionType = '';
	let actionError = '';

	$: governedAccessHref = governedActionGate
		? buildControlPlaneBridgeHref(governedActionGate.controlPlaneSurface, { threadId })
		: '';

	async function runAction(actionType: WidgetOf<'facility_response'>['data']['actions'][number]['type']) {
		pendingActionType = actionType;
		actionError = '';

		try {
			await runThreadAction(threadId, { type: actionType });
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to record the facility response.';
		} finally {
			pendingActionType = '';
		}
	}
</script>

<div class="stack" data-thread-id={threadId}>
	<div class="row">
		<strong>{widget.data.summary}</strong>
		<span class={`status-pill ${widget.data.status === 'placement_confirmed' ? 'good' : widget.data.status === 'closed' ? 'warn' : ''}`}>
			{widget.data.statusLabel}
		</span>
	</div>

	<p>{widget.data.detail}</p>

	<div class="split">
		<div class="list-block">
			<div class="eyebrow">Completed</div>
			<ul>
				{#each widget.data.completedSteps as step}
					<li>{step}</li>
				{/each}
			</ul>
		</div>

		<div class="list-block">
			<div class="eyebrow">Pending</div>
			<ul>
				{#each widget.data.pendingSteps as step}
					<li>{step}</li>
				{/each}
			</ul>
		</div>
	</div>

	{#if widget.data.actions.length > 0}
		<div class="actions">
			{#each widget.data.actions as action}
				<button
					type="button"
					class={`action-button ${action.tone}`}
					on:click={() => runAction(action.type)}
					disabled={
						pendingActionType.length > 0 ||
						Boolean(governedActionGate) ||
						intakeProtectedActionsBlocked
					}
				>
					{pendingActionType === action.type ? action.pendingLabel : action.label}
				</button>
			{/each}
		</div>
	{/if}

	{#if intakeProtectedActionsBlocked}
		<div class="access-note warn">
			<strong>Secure verification required</strong>
			<p>{intakeProtectionMessage}</p>
		</div>
	{/if}

	{#if governedActionGate}
		<div class={`access-note ${governedActionGate.tone}`}>
			<strong>{governedActionGate.label}</strong>
			<p>{governedActionGate.message}</p>
			<a href={governedAccessHref} target="_blank" rel="noreferrer">
				{governedActionGate.ctaLabel}
			</a>
		</div>
	{/if}

	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</div>

<style>
	.stack,
	.split,
	.list-block {
		display: grid;
		gap: 0.85rem;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.split {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.list-block {
		padding: 0.95rem 1rem;
		border-radius: 16px;
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.access-note {
		display: grid;
		gap: 0.45rem;
		padding: 0.9rem 1rem;
		border-radius: 16px;
		border: 1px solid var(--line);
		background: var(--surface-soft);
	}

	.access-note.warn {
		border-color: rgba(255, 214, 153, 0.24);
	}

	.access-note.danger {
		border-color: rgba(255, 150, 144, 0.24);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.action-button.secondary {
		background: var(--surface-overlay);
		color: var(--ink);
		border: 1px solid var(--line);
	}

	.action-button.danger {
		background: var(--danger-soft);
		color: var(--danger);
		border-color: rgba(255, 150, 144, 0.24);
	}

	p,
	ul {
		margin: 0;
	}

	a {
		color: var(--accent);
		text-decoration: none;
		font-weight: 600;
	}

	ul {
		padding-left: 1rem;
	}

	.error-text {
		color: var(--danger);
		font-size: 0.92rem;
	}

	@media (max-width: 720px) {
		.split {
			grid-template-columns: 1fr;
		}
	}
</style>
