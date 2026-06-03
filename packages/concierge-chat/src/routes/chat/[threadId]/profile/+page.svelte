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

	async function submitAction(
		actionId: string,
		action: {
			type: 'confirm_fields' | 'reject_fields' | 'capture_consent';
			fieldKeys?: string[];
		}
	) {
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

	function getCandidateFieldStatusLabel(status: string) {
		switch (status) {
			case 'confirmed':
				return 'saved';
			case 'rejected':
				return 'needs correction';
			default:
				return 'check with you';
		}
	}

	$: showInternalOperatorUi = data.agencyAccess.status !== 'anonymous';
	$: profileFields = data.threadView.profileAudit.sections.flatMap((section) => section.items);
	$: confirmedFieldCount = profileFields.filter((field) => field.status === 'confirmed').length;
	$: needsCorrectionCount = profileFields.filter((field) => field.status === 'rejected').length;
	$: pendingReviewCount = profileFields.filter(
		(field) => field.status !== 'confirmed' && field.status !== 'rejected'
	).length;
	$: summaryCards = showInternalOperatorUi
		? [
				{
					label: 'Confirmed fields',
					value: data.threadView.profileAudit.snapshot.confirmedCount
				},
				{
					label: 'Inferred fields',
					value: data.threadView.profileAudit.snapshot.inferredCount
				},
				{
					label: 'Candidate fields',
					value: data.threadView.profileAudit.snapshot.candidateCount
				}
			]
		: [
				{ label: 'Saved details', value: confirmedFieldCount },
				{ label: 'Need your review', value: pendingReviewCount },
				{ label: 'Need correction', value: needsCorrectionCount }
			];
</script>

<section class="glass panel">
	<div class="section-header">
		<div>
			<div class="eyebrow">{showInternalOperatorUi ? 'Profile Audit' : 'Application details'}</div>
			<h1 class="section-title">{data.threadView.thread.title}</h1>
		</div>
		<a class="link-button" href={`/chat/${data.threadView.thread.id}`}>
			{showInternalOperatorUi ? 'Back to thread' : 'Back to conversation'}
		</a>
	</div>

	<p class="muted">
		{#if showInternalOperatorUi}
			Inferred and confirmed values remain visibly distinct. Sensitive fields must be explicitly
			confirmed before they are used for external writes.
		{:else}
			Review what Concierge has captured so far. If anything looks off, mark it for correction or
			send the update in chat and I will adjust it.
		{/if}
	</p>

	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</section>

<section class="grid-3 section-gap">
	{#each summaryCards as card}
		<div class="glass panel stat-card">
			<strong>{card.value}</strong>
			<div class="muted">{card.label}</div>
		</div>
	{/each}
</section>

<section class="section-gap audit-grid">
	{#each data.threadView.profileAudit.sections as section}
		<div class="glass panel">
			<div class="section-header">
				<h2 class="section-title">{section.label}</h2>
				<span class="status-pill">{section.items.length} items</span>
			</div>

			{#if section.items.length === 0}
				<p class="muted">
					{showInternalOperatorUi ? 'No fields in this state.' : 'Nothing to review here yet.'}
				</p>
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
											{#if showInternalOperatorUi}
												{isActionPending('capture_consent') ? 'Capturing...' : 'Capture consent'}
											{:else}
												{isActionPending('capture_consent') ? 'Saving...' : 'I agree'}
											{/if}
										</button>
									</div>
								{:else if field.status !== 'confirmed' && field.status !== 'rejected'}
									<div class="field-actions">
										<button
											type="button"
											on:click={() => confirmField(field.key)}
											disabled={activeAction !== ''}
										>
											{#if showInternalOperatorUi}
												{isActionPending(`confirm:${field.key}`) ? 'Confirming...' : 'Confirm'}
											{:else}
												{isActionPending(`confirm:${field.key}`) ? 'Saving...' : 'Looks right'}
											{/if}
										</button>
										<button
											class="ghost"
											type="button"
											on:click={() => rejectField(field.key)}
											disabled={activeAction !== ''}
										>
											{#if showInternalOperatorUi}
												{isActionPending(`reject:${field.key}`) ? 'Updating...' : 'Mark for correction'}
											{:else}
												{isActionPending(`reject:${field.key}`) ? 'Saving...' : 'Needs correction'}
											{/if}
										</button>
									</div>
								{:else if field.status === 'rejected'}
									<div class="action-note">
										{showInternalOperatorUi
											? 'Send corrected details in chat to reopen this field.'
											: 'Reply in chat with the corrected detail and Concierge will update it.'}
									</div>
								{/if}
							</div>

							<div class="field-meta">
								<span class={`status-pill ${field.status === 'confirmed' ? 'good' : 'warn'}`}>
									{showInternalOperatorUi ? field.status : getCandidateFieldStatusLabel(field.status)}
								</span>
								{#if showInternalOperatorUi}
									<span>
										{Math.round(field.confidence * 100)}% / {getFieldConfidenceBand(field.confidence)}
									</span>
									<span>{field.fieldClass}</span>
									{#if requiresExplicitConfirmation(field)}
										<span class="status-pill danger">explicit confirmation</span>
									{/if}
								{:else if requiresExplicitConfirmation(field) && field.status !== 'confirmed'}
									<span class="muted">Needs your okay before it can move forward.</span>
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

	.stat-card {
		display: grid;
		gap: 0.35rem;
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
		flex: 1 1 28rem;
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

	@media (max-width: 760px) {
		.field-meta {
			justify-items: start;
		}
	}
</style>
