<script lang="ts">
	import { runThreadAction } from '$chat/client-actions';
	import { getFieldConfidenceBand, requiresExplicitConfirmation } from '$lib/profile/types';
	import type { PageData } from './$types';

	export let data: PageData;

	let activeAction = '';
	let actionError = '';

	function isActionPending(actionId: string) {
		return activeAction === actionId;
	}

	async function submitAction(actionId: string, action: {
		type: 'confirm_fields' | 'reject_fields' | 'capture_consent';
		fieldKeys?: string[];
	}) {
		activeAction = actionId;
		actionError = '';

		try {
			await runThreadAction(data.threadView.thread.id, action);
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to update the profile field.';
		} finally {
			activeAction = '';
		}
	}

	function confirmField(fieldKey: string) {
		return submitAction(`confirm:${fieldKey}`, {
			type: 'confirm_fields',
			fieldKeys: [fieldKey]
		});
	}

	function rejectField(fieldKey: string) {
		return submitAction(`reject:${fieldKey}`, {
			type: 'reject_fields',
			fieldKeys: [fieldKey]
		});
	}

	function captureConsent() {
		return submitAction('capture_consent', { type: 'capture_consent' });
	}
</script>

<section class="glass panel">
	<div class="section-header">
		<div>
			<div class="eyebrow">Profile Audit</div>
			<h1 class="section-title">{data.threadView.thread.title}</h1>
		</div>
		<a class="link-button" href={`/chat/${data.threadView.thread.id}`}>Back to thread</a>
	</div>

	<p class="muted">
		Inferred and confirmed values remain visibly distinct. Sensitive fields must be explicitly
		confirmed before they are used for external writes.
	</p>

	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</section>

<section class="grid-3 section-gap">
	<div class="glass panel">
		<strong>{data.threadView.profileAudit.snapshot.confirmedCount}</strong>
		<div class="muted">Confirmed fields</div>
	</div>
	<div class="glass panel">
		<strong>{data.threadView.profileAudit.snapshot.inferredCount}</strong>
		<div class="muted">Inferred fields</div>
	</div>
	<div class="glass panel">
		<strong>{data.threadView.profileAudit.snapshot.candidateCount}</strong>
		<div class="muted">Candidate fields</div>
	</div>
</section>

<section class="section-gap audit-grid">
	{#each data.threadView.profileAudit.sections as section}
		<div class="glass panel">
			<div class="section-header">
				<h2 class="section-title">{section.label}</h2>
				<span class="status-pill">{section.items.length} items</span>
			</div>

			{#if section.items.length === 0}
				<p class="muted">No fields in this state.</p>
			{:else}
				<div class="field-table">
					{#each section.items as field}
						<div class="field-row">
							<div class="field-body">
								<div>
									<strong>{field.label}</strong>
									<div>{field.value}</div>
									<div class="note">{field.note ?? 'No additional note.'}</div>
								</div>

								{#if field.key === 'background_check_consent' && field.status !== 'confirmed'}
									<div class="field-actions">
										<button
											type="button"
											on:click={captureConsent}
											disabled={activeAction !== ''}
										>
											{isActionPending('capture_consent') ? 'Capturing...' : 'Capture consent'}
										</button>
									</div>
								{:else if field.status !== 'confirmed' && field.status !== 'rejected'}
									<div class="field-actions">
										<button
											type="button"
											on:click={() => confirmField(field.key)}
											disabled={activeAction !== ''}
										>
											{isActionPending(`confirm:${field.key}`) ? 'Confirming...' : 'Confirm'}
										</button>
										<button
											class="ghost"
											type="button"
											on:click={() => rejectField(field.key)}
											disabled={activeAction !== ''}
										>
											{isActionPending(`reject:${field.key}`) ? 'Updating...' : 'Mark for correction'}
										</button>
									</div>
								{:else if field.status === 'rejected'}
									<div class="action-note">Send corrected details in chat to reopen this field.</div>
								{/if}
							</div>

							<div class="field-meta">
								<span class={`status-pill ${field.status === 'confirmed' ? 'good' : 'warn'}`}>
									{field.status}
								</span>
								<span>
									{Math.round(field.confidence * 100)}% / {getFieldConfidenceBand(field.confidence)}
								</span>
								<span>{field.fieldClass}</span>
								{#if requiresExplicitConfirmation(field)}
									<span class="status-pill danger">explicit confirmation</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</section>

<style>
	.panel {
		padding: 1.2rem;
	}

	.section-gap {
		margin-top: 1rem;
	}

	.section-header,
	.field-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.link-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: 999px;
		background: var(--button-bg);
		color: var(--button-ink);
		text-decoration: none;
		border: 1px solid rgba(167, 184, 255, 0.18);
	}

	.audit-grid,
	.field-table {
		display: grid;
		gap: 1rem;
	}

	.field-row {
		padding: 1rem 0;
		border-top: 1px solid var(--line);
	}

	.field-body {
		display: grid;
		gap: 0.85rem;
	}

	.field-meta {
		display: grid;
		gap: 0.35rem;
		justify-items: end;
		font-size: 0.88rem;
		color: var(--muted);
	}

	.note {
		margin-top: 0.35rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.field-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.ghost {
		background: var(--surface-overlay);
		color: var(--ink);
		border: 1px solid var(--line);
	}

	.action-note,
	.error-text {
		color: var(--muted);
		font-size: 0.92rem;
	}

	.error-text {
		margin-top: 1rem;
		color: var(--danger);
	}
</style>
